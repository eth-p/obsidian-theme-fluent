const log = require("fancy-log");
const chalk = require("chalk");

module.exports = function errorHandler(error) {
	const lines = error.message.split("\n");

    // Add source info.
    const source = extractSourceInfo(error);
    if (source !== "") {
        lines.unshift(chalk.red("In " + source));
    }

    // Add text info.
    if (error.postcssNode) {
        lines.push(chalk.dim(error.postcssNode.toString()));
    }

    // Format and print.
    const formatted = lines
        .map((x) => `    ...    ${chalk.red("|")} ${x}`)
        .join("\n");

	log.error(`${chalk.red("Encountered error: ")}\n${formatted}`);
};

function extractSourceInfo(error) {
	const file = error.fileName ? chalk.magenta(error.fileName) : "";
	const pos = error.postcssNode ? `:${error.postcssNode.source.start.line}:${error.postcssNode.source.start.column}` : "";

    return `${file}${file && pos}`;
}
