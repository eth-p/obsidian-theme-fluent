const { readFileSync } = require("fs");

const gulp = require("gulp");
const postcss = require("gulp-postcss");
const sass = require("gulp-sass")(require("sass"));
const concat = require("gulp-concat");
const plumber = require("gulp-plumber");
const prettier = require("gulp-prettier");
const sourcemaps = require("gulp-sourcemaps");
const noop = require("gulp-noop");

const run_if = require("gulp-if");
const errorHandler = require("./plumber-error-handler");

const SOURCE_DIR = "../src";
const DEST_DIR = "../";

function build({ production = true, plumber }) {
	const postcss_plugins = [
		require("./postcss-parent-selector"),
		production &&
			require("cssnano")({
				preset: [
					"default",
					{
						discardComments: {
							removeAll: false,
						},
					},
				],
			}),
	].filter((x) => !!x);

	return gulp
		.src([
			`${SOURCE_DIR}/use.scss`,
			`${SOURCE_DIR}/{mixins,placeholders}/*.scss`,
			`${SOURCE_DIR}/config.scss`,
			`${SOURCE_DIR}/fluent.scss`,
			`${SOURCE_DIR}/features/*.scss`,
		])
		.pipe(run_if(plumber != null, plumber || noop()))
		.pipe(run_if(production !== true, sourcemaps.init()))
		.pipe(concat("theme.scss"))
		.pipe(sass({}))
		.pipe(postcss(postcss_plugins))
		.pipe(run_if(production === true, prettier(JSON.parse(readFileSync("../.prettierrc", "utf8")))))
		.pipe(run_if(production !== true, sourcemaps.write()))
		.pipe(gulp.dest(DEST_DIR));
}

gulp.task("build", build);
gulp.task("watch", () => {
	build({ production: false, plumber: plumber({ errorHandler }) });
	gulp.watch(`${SOURCE_DIR}/**/*.scss`, function incremental() {
		return build({ production: false, plumber: plumber({ errorHandler }) });
	});
});
