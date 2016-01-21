'use strict';

var fs     = require('fs');
var path   = require('path');
var logger = require('../logger');
var plugin = require('../plugins');

var piName = 'testPlugin';

var _setUp = function (done) {
    this.plugin = new plugin.Plugin(piName);
    done();
};

/*

From: https://github.com/haraka/Haraka/pull/1278#issuecomment-172134064

    * Need to test installed mode + core mode
    * Need to test each variation of loading plugins
        INSTALLED MODE
            * Create tests/installation/ with config/, plugins/, and node_modules
            * Plugin in <install_dir>/plugins/<name>.js
            * Plugin in <install_dir>/plugins/<name>/ with package.json
            * Plugin in <install_dir>/node_modules/<name>/ with package.json
        CORE MODE + INSTALLED MODE
            * Plugin in <core>/plugins/<name>.js
            * Plugin in <core>/plugins/<name>/ with package.json
            * Plugin in <core>/node_modules/<name>/ with package.json
    * Need to test conflict on name in various forms
        * Check plugins/<name>.js loads, not node_modules/<name>/package.json
        * Should be enough of a check(?)
    * Need to test plugin not existing
        * Check <bogus_name_guaranteed_to_not_exist> fails
    * Need to test plugin existing and failing to compile
        * Create bad plugin in tests/installation/plugins/bad_plugin.js
    * Need to test plugin inheritance
        * Base plugin in tests/installation/plugins/base_plugin.js
        * Real plugin in tests/installation/plugins/inherits.js
        * Check base methods work
        * Check plugin.base.base_plugin is set/correct
    * Plugin timeouts (already tested)

*/

exports.plugin = {
    'new Plugin() object': function (test) {
        var pi = new plugin.Plugin(piName);
        test.expect(1);
        test.ok(pi);
        test.done();
    }
};

var toPath = './config/' + piName + '.timeout';

var toVals = [ '0', '3', '60', 'apple'];
var getVal = function () {
    return toVals.shift();
};

exports.get_timeout = {
    setUp : function (done) {
        process.env.WITHOUT_CONFIG_CACHE=true;
        this.to = getVal();
        fs.writeFile(toPath, this.to, done);
    },
    tearDown : function (done) {
        fs.unlink(toPath, done);
    },
    '0s' : function (test) {
        var pi = new plugin.Plugin(piName);
        test.expect(1);
        test.equal( pi.timeout, this.to );
        test.done();
    },
    '3s' : function (test) {
        var pi = new plugin.Plugin(piName);
        test.expect(1);
        test.equal( pi.timeout, this.to );
        test.done();
    },
    '60s' : function (test) {
        var pi = new plugin.Plugin(piName);
        test.expect(1);
        test.equal( pi.timeout, this.to );
        test.done();
    },
    '30s default' : function (test) {
        var pi = new plugin.Plugin(piName);
        test.expect(1);
        test.equal( pi.timeout, 30 );
        test.done();
    },
};

exports.get_plugin_paths = {

    /* jshint maxlen: 90 */
    setUp : _setUp,

    './path' : function (test) {

        ['HARAKA', 'HARAKA_PLUGIN_PATH'].forEach(function (env) {
            delete process.env[env];
        });

        test.expect(2);
        test.deepEqual(
            this.plugin._get_plugin_paths(),
            [
                path.join(__dirname, '../plugins'),
                path.join(__dirname, '../node_modules'),
            ],
            'default ./path'
        );
        test.deepEqual(
            this.plugin.full_paths,
            [
                path.join(__dirname, '../plugins', 'testPlugin.js'),
            ],
            'full_paths');
        test.done();
    },

    'HARAKA' : function (test) {

        ['HARAKA_PLUGIN_PATH'].forEach(function (env) {
            delete process.env[env];
        });
        process.env.HARAKA = '/etc/haraka';

        test.expect(1);
        test.deepEqual(
            this.plugin._get_plugin_paths(),
            [
                path.join('/etc', 'haraka', 'plugins'),
                path.join('/etc', 'haraka', 'node_modules'),
                path.join(__dirname, '..', 'plugins'),
                path.join(__dirname, '..', 'node_modules'),
            ],
            'default ./path'
        );
        test.done();
    },

    'HARAKA_PLUGIN_PATH' : function (test) {

        ['HARAKA'].forEach(function (env) {
            delete process.env[env];
        });
        process.env.HARAKA_PLUGIN_PATH = '/etc/haraka_plugins';

        test.expect(1);
        test.deepEqual(
            this.plugin._get_plugin_paths(),
            [
                path.join('/etc', '/haraka_plugins'),
                path.join(__dirname, '../plugins'),
                path.join(__dirname, '../node_modules'),
            ],
            'default + HARAKA_PLUGIN_PATH');
        test.done();
    },

    'all of the above' : function (test) {

        process.env.HARAKA = '/etc/haraka';
        process.env.HARAKA_PLUGIN_PATH = '/etc/haraka_plugins';

        test.expect(1);
        test.deepEqual(
            this.plugin._get_plugin_paths(),
            [
                path.join(process.env.HARAKA_PLUGIN_PATH),
                path.join(process.env.HARAKA + '/plugins'),
                path.join(process.env.HARAKA + '/node_modules'),
                path.join(__dirname, '../plugins'),
                path.join(__dirname, '../node_modules'),
            ],
            'all paths are ordered correctly'
        );
        test.done();
    },
};

exports.load_plugins = {

    setUp: function (done) {
        process.env.HARAKA = __dirname;

        this.orig_make_custom_require = plugin._make_custom_require;
        plugin._make_custom_require = function (filePath, hasPackageJson) {
            return function (module) {
                return require(path.join(__dirname, 'node_modules', module));
            };
        };

        this.plugin = plugin.load_plugin('test-plugin');
        done();
    },

    tearDown: function (done) {
        plugin._make_custom_require = this.orig_make_custom_require;
        done();
    },

    'load from install directory node_modules': function (test) {
        test.expect(1);
        test.ok(this.plugin.hasOwnProperty('hook_init_master'));
        test.done();
    },

};
