const parser = require("postcss-selector-parser");

/**
 * Returns true if the provided nodes are equal.
 * This compares the selector descriptions.
 *
 * @param {Node} a
 * @param {Node} b
 * @returns {boolean}
 */
function nodesEqual(a, b) {
	// console.log(`CMP ${a} WITH ${b}`);
	if (a.type !== b.type) return false;
	if (a.value !== b.value) return false;

	// Check the nodes are the same.
	if (a.nodes instanceof Array && b.nodes instanceof Array) {
		if (a.nodes.length !== b.nodes.length) return false;
		for (let i = 0; i < a.nodes.length; i++) {
			if (!nodesEqual(a.nodes[i], b.nodes[i])) return false;
		}
	}

	if (a.nodes !== b.nodes) {
		return false;
	}

	return true;
}

module.exports = (opts = {}) => {
	const transform = parser((selectors) => {
		const instructions = [];

		// Handle each instruction.
		selectors.walkPseudos((pseudo) => {
			if (pseudo.value !== ":--parent" && pseudo.value !== ":--parent-optionally") {
				return;
			}

			let applyToLast = false;
			let required = pseudo.value === ":--parent";

			// Extract the condition.
			const condition = pseudo.next();

			// Extract options.
			const options = [":last", ":first"];
			while (condition.type === "pseudo" && options.includes(condition.value)) {
				switch (condition.value) {
					case ":last":
						applyToLast = true;
						break;

					case ":first":
						applyToLast = false;
						break;
				}

				condition.remove();
				condition = condition.next();
			}

			if (condition == null || condition.type !== "pseudo") {
				throw selectors.error(":--parent must be directly followed by a pseudo selector", {
					index: pseudo.sourceIndex,
					word: pseudo.toString(),
				});
			}

			// Extract and find the parent.
			// This treats the parentDescription as a state machine while looking upwards from the current node.
			const parentDescription = pseudo.nodes[0].nodes.reverse();
			const parents = pseudo.parent.split((node) => node.next() === pseudo)[0];
			let parent = null;
			let parentEnd = parents[parents.length - 1];
			let offset = 0;
			while (parents.length > 0) {
				parent = parents.pop();

				if (nodesEqual(parent, parentDescription[offset])) {
					offset++;
					if (offset === parentDescription.length) {
						break;
					}
				} else {
					parentsEnd = parent;
					offset = 0;
				}
			}

			const found = offset === parentDescription.length;
			if (required && !found) {
				throw selectors.error(
					`Could not find parent selector.\nSelector (${parentDescription
						.map((x) => x.toString())
						.join(" ")}) not matched.`,
					{
						index: pseudo.sourceIndex,
						word: pseudo.toString(),
					}
				);
			}

			// Remove the :--parent transformation selector.
			pseudo.remove();
			condition.remove();

			// Update the parent to add the condition.
			if (found) {
				const target = applyToLast ? parentEnd : parent;
				switch (condition.value) {
					case ":is": {
						target.parent.insertAfter(target, parser.selector({ nodes: condition.nodes }));
						break;
					}

					default:
						throw selectors.error(`:--parent cannot apply ${condition.value} selector`);
				}
			}
		});
	});

	return {
		postcssPlugin: "transform-parent-selector",

		Rule(rule, postcss) {
			rule.selector = transform.processSync(rule.selector);
		},
	};
};

module.exports.postcss = true;
