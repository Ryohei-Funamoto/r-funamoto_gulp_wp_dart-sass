const { src, dest, watch, series, parallel } = require('gulp');

// 入出力するフォルダを指定
const srcBase = './static/src';
const assetsBase = './assets';
const publicBase = './assets/public';
const distBase = './static/dist';
const serverBase = './app/public/wp-content/themes/dummy'; // Local by Flywheelのテーマフォルダまでのパス。dummyの部分を任意のテーマフォルダ名に変える

// 既存のファイルの読み込みパス
const publicPath = {
  'public': [publicBase + '/**/*', '!' + publicBase + '/**/*.gitkeep']
};

// ファイルの読み込みパス
const srcPath = {
  'scss': assetsBase + '/scss/**/*.scss',
  'js': assetsBase + '/js/**/*.js',
  'img': assetsBase + '/img/**/*',
  'html': srcBase + '/**/*.html',
  'ejs': [assetsBase + '/ejs/**/*.ejs', '!' + assetsBase + '/ejs/**/_*.ejs'],
  'pug': [assetsBase + '/pug/**/*.pug', '!' + assetsBase + '/pug/**/_*.pug']
};

// 監視ファイルのパス
const watchPath = {
  'ejs': [assetsBase + '/ejs/**/*.ejs', assetsBase + '/data/**/*.json'],
  'pug': [assetsBase + '/pug/**/*.pug', assetsBase + '/data/**/*.json']
};

// JSONデータのパス
const dataPath = {
  'data': assetsBase + '/data/site.json'
};

// ファイルの吐き出し先パス
const distPath = {
  'css': distBase + '/css/',
  'js': distBase + '/js/',
  'img': distBase + '/img/',
  'html': distBase + '/',
  'ejs': distBase + '/',
  'pug': distBase + '/',
  'wpCss': serverBase + '/css/',
  'wpJs': serverBase + '/js/',
  'wpImg': serverBase + '/img/'
};

// 本番とテストの設定
const env = process.env.NODE_ENV ? process.env.NODE_ENV.trim() : '';

// 本番環境用設定
if (env === 'production') {
  // thisCssStyle = 'compressed'; // css圧縮する
  thisCssStyle = 'expanded'; // css圧縮しない
  thisCssMap = false; // css.mapを作成しない
  thisCssGroupMediaQueries = true; // メディアクエリをまとめる
}
// テスト環境用設定
else if (env === 'development') {
  thisCssStyle = 'expanded'; // css圧縮しない
  thisCssMap = true; // css.mapを作成する
  thisCssGroupMediaQueries = false; // メディアクエリをまとめない
}

/**
 * clean
 */
const del = require('del');

const delPath = {
  // 'css': [distBase + '/css/**', '!' + distBase + '/css/'],
  // 'js': [distBase + '/js/**', '!' + distBase + '/js/'],
  // 'img': [distBase + '/img/**', '!' + distBase + '/img/'],
  // 'html': [distBase + '/**/*.html', '!' + distBase],
  'wpCss': [serverBase + '/css/**', '!' + serverBase + '/css/'],
  'wpJs': [serverBase + '/js/**', '!' + serverBase + '/js/'],
  'wpImg': [serverBase + '/img/**', '!' + serverBase + '/img/']
};
const clean = (done) => {
  // del(delPath.css, { force: true });
  // del(delPath.js, { force: true });
  // del(delPath.img, { force: true });
  // del(delPath.html, { force: true });
  del(delPath.wpCss, { force: true });
  del(delPath.wpJs, { force: true });
  del(delPath.wpImg, { force: true });
  done();
};

/**
 * ブラウザリロード
 */
const browserSync = require('browser-sync');

const browserSyncOption = {
  // server: distBase // HTMLサイトの場合
  proxy: 'http://dummy.local' // WordPressサイトの場合(Local by Flywheel)。dummyの部分を任意の名前に変える
};
const browserSyncFunc = () => {
  browserSync.init(browserSyncOption);
};
const browserSyncReload = (done) => {
  browserSync.reload();
  done();
};

/**
 * Sass
 */
const sass = require('gulp-dart-sass'); // Dart SassはSass公式が推奨 @use構文などが使える
const sassGlob = require('gulp-sass-glob-use-forward'); // Dart SassでGlobを使う
const plumber = require('gulp-plumber'); // エラーが発生しても強制終了させない
const notify = require('gulp-notify'); // エラー発生時のアラート出力
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer'); // ベンダープレフィックス自動付与
const cssdeclsort = require('css-declaration-sorter'); // CSSプロパティの順番を設定
const gcmq = require('gulp-group-css-media-queries'); // メディアクエリをまとめる
const gulpif = require('gulp-if');

const cssSass = () => {
  return src(srcPath.scss, { sourcemaps: thisCssMap })
    .pipe(
      //エラーが出ても処理を止めない
      plumber({
        errorHandler: notify.onError('Error:<%= error.message %>')
      }))
    .pipe(sassGlob())
    .pipe(sass.sync({
      includePaths: ['assets/scss'],
      outputStyle: thisCssStyle
    }))
    .pipe(postcss([
      autoprefixer(),
      cssdeclsort({ order: 'alphabetical' })
    ]))
    .pipe(gulpif(thisCssGroupMediaQueries, gcmq())) // メディアクエリをまとめる
    // .pipe(dest(distPath.css, { sourcemaps: './' })) // コンパイル先(HTML)
    .pipe(dest(distPath.wpCss, { sourcemaps: './' })) // コンパイル先(WordPress)
    .pipe(browserSync.stream())
    .pipe(notify({
      message: 'Sassをコンパイルしました！',
      onLast: true
    }))
};

/**
 * JavaScript
 */
const js = () => {
  return src(srcPath.js)
    // .pipe(dest(distPath.js)) // 吐き出し先(HTML)
    .pipe(dest(distPath.wpJs)) // 吐き出し先(WordPress)
};

/**
 * 画像圧縮
 */
const imagemin = require('gulp-imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');
const imageminSvgo = require('imagemin-svgo');

const imgImagemin = () => {
  return src(srcPath.img)
    .pipe(
      imagemin(
        [
          imageminMozjpeg({ quality: 80 }),
          imageminPngquant(),
          imageminSvgo({
            plugins: [{
              removeViewBox: false
            }]
          })
        ], {
        verbose: true
      }
      ))
    // .pipe(dest(distPath.img)) // 吐き出し先(HTML)
    .pipe(dest(distPath.wpImg)) // 吐き出し先(WordPress)
};


/**
 * HTML
 */
const html = () => {
  return src(srcPath.html)
    .pipe(dest(distPath.html))
};

/**
 * 既存ファイル
 */
const public_file = () => {
  return src(publicPath.public)
    // .pipe(dest(distBase)) // 吐き出し先(HTML)
    .pipe(dest(serverBase)) // 吐き出し先(WordPress)
};

/**
 * EJS
 */
const ejs = require('gulp-ejs');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const htmlbeautify = require('gulp-html-beautify');
const fs = require('fs');

const ejsHTML = () => {
  const json = JSON.parse(fs.readFileSync(dataPath.data));

  return src(srcPath.ejs)
    .pipe(
      // エラーが出ても処理を止めない
      plumber({
        errorHandler: notify.onError('Error:<%= error.message %>')
      }))
    .pipe(
      ejs({
        jsonData: json
      }))
    .pipe(
      htmlbeautify({
        indent_size: 2, // インデントサイズ
        indent_char: ' ', // インデントに使う文字列を半角スペース1個分に
        max_preserve_newlines: 0, // 許容する連続改行数
        preserve_newlines: true, // コンパイル前のコード改行
        indent_inner_html: false, // head, bodyをインデント
        extra_liners: [] // 終了タグの前に改行を入れるタグを配列で指定。head, body, htmlの前で改行しない場合は[]を指定
      })
    )
    .pipe(rename({ extname: '.html' }))
    .pipe(replace(/[\s\S]*?(<!DOCTYPE)/, '$1'))
    .pipe(dest(distPath.ejs))
    .pipe(notify({
      message: 'HTMLをコンパイルしました！',
      onLast: true
    }))
};

/**
 * Pug
 */
const pug = require('gulp-pug');

const pugHTML = () => {
  const json = JSON.parse(fs.readFileSync(dataPath.data));

  return src(srcPath.pug)
    .pipe(
      // エラーが出ても処理を止めない
      plumber({
        errorHandler: notify.onError('Error:<%= error.message %>')
      }))
    .pipe(
      pug({
        locals: json,
        pretty: true
      }))
    .pipe(dest(distPath.pug))
    .pipe(notify({
      message: 'HTMLをコンパイルしました！',
      onLast: true
    }))
};

/**
 * ファイル監視
 * ファイルの変更を検知すると、browserSyncReloadでreloadメソッドを呼び出す
 * watch('監視するファイル', 処理)
 * series -> 順番に実行
 */
const watchFiles = () => {
  watch(srcPath.scss, series(cssSass, browserSyncReload))
  watch(srcPath.js, series(js, browserSyncReload))
  watch(srcPath.img, series(imgImagemin, browserSyncReload))
  // watch(srcPath.html, series(html, browserSyncReload))
  watch(publicPath.public, series(public_file, browserSyncReload))
  // watch(watchPath.ejs, series(ejsHTML, browserSyncReload))
  // watch(watchPath.pug, series(pugHTML, browserSyncReload))
};

/**
 * 一度cleanでdistフォルダ内を削除し、最新の状態を吐き出す
 * series -> 順番に実行
 * parallel -> 並列で実行
 */
module.exports = {
  default: series(series(clean, cssSass, js, imgImagemin, public_file), parallel(watchFiles, browserSyncFunc)),
  build: series(series(clean, cssSass, js, imgImagemin, public_file))
};
