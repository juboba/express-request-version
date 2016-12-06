'use strict';

const version = require('../lib/versioner');

module.exports = {
  setUp(cb) {
    this.supportedVersions = [
      'v1.0.0',
      'v1.0.1',
      'v1.1.0',
      'v1.1.1',
    ];
    cb();
  },
  setByPath: {
    default(test) {
      test.expect(4);

      const middleware = version.setByPath();
      const req = { path: '/v1/foo' };
      middleware(req, {}, () => {
        test.equal(req.version, 'v1', 'Version not set correctly by path.');

        req.path = '/v1.1/foo';
        middleware(req, {}, () => {
          test.equal(req.version, 'v1.1');

          req.path = '/v1.1.1/foo';
          middleware(req, {}, () => {
            test.equal(req.version, 'v1.1.1');

            req.path = '/foo';
            delete req.version;
            middleware(req, {}, () => {
              test.equal(typeof req.version, 'undefined');
              test.done();
            });
          });
        });
      });
    },
    withPathPrefix(test) {
      test.expect(1);

      const middleware = version.setByPath('/prefix/');
      const req = { path: '/prefix/v1/foo' };
      middleware(req, {}, () => {
        test.equal(req.version, 'v1', 'Version not set correctly by path.');
        test.done();
      });
    },
  },
  setBySemverPath: {
    missingSupportedVersions(test) {
      test.expect(1);

      test.throws(() => version.setBySemverPath(), 'Error not thrown.');
      test.done();
    },
    default(test) {
      test.expect(3);
      const middleware = version.setBySemverPath(this.supportedVersions);
      const req = { path: '/v1/foo' };
      middleware(req, {}, () => {
        test.equal(req.origVersion, 'v1', 'Unexpected origVersion');
        test.equal(req.version, 'v1.0.0', 'Unexpected version');
        delete req.origVersion;
        req.path = '/foo';
        middleware(req, {}, () => {
          test.equal(typeof req.origVersion, 'undefined', 'Unexpected orig version.');
          test.done();
        });
      });
    },
    exactVersion(test) {
      test.expect(2);
      const middleware = version.setBySemverPath(this.supportedVersions);
      const req = { path: '/v1/foo' };
      middleware(req, {}, () => {
        test.equal(req.origVersion, 'v1', 'Unexpected origVersion');
        test.equal(req.version, 'v1.0.0', 'Unexpected version');
        test.done();
      });
    },
    hyphenRange(test) {
      test.expect(2);
      const middleware = version.setBySemverPath(this.supportedVersions);
      const req = { path: '/v1 - v2/foo' };
      middleware(req, {}, () => {
        test.equal(req.origVersion, 'v1 - v2', 'Unexpected origVersion');
        test.equal(req.version, 'v1.1.1', 'Unexpected version');
        test.done();
      });
    },
    xRange(test) {
      test.expect(2);
      const middleware = version.setBySemverPath(this.supportedVersions);
      const req = { path: '/v1.0.x/foo' };
      middleware(req, {}, () => {
        test.equal(req.origVersion, 'v1.0.x', 'Unexpected origVersion');
        test.equal(req.version, 'v1.0.1', 'Unexpected version');
        test.done();
      });
    },
    tildeRange(test) {
      test.expect(2);
      const middleware = version.setBySemverPath(this.supportedVersions);
      const req = { path: '/~v1.0.0/foo' };
      middleware(req, {}, () => {
        test.equal(req.origVersion, '~v1.0.0', 'Unexpected origVersion');
        test.equal(req.version, 'v1.0.1', 'Unexpected version');
        test.done();
      });
    },
    caretRange(test) {
      test.expect(2);
      const middleware = version.setBySemverPath(this.supportedVersions);
      const req = { path: '/^v1.0.0/foo' };
      middleware(req, {}, () => {
        test.equal(req.origVersion, '^v1.0.0', 'Unexpected origVersion');
        test.equal(req.version, 'v1.1.1', 'Unexpected version');
        test.done();
      });
    },
    encodedCaretRange(test) {
      const middleware = version.setBySemverPath(['v1.0.0']);
      const req = { path: '/%5Ev1.0.0/foo' };
      middleware(req, {}, () => {
        test.equal(req.origVersion, '^v1.0.0', 'Unexpected origVersion');
        test.equal(req.version, 'v1.0.0', 'Unexpected version');
        test.done();
      });
    },
  },
  setByAccept: {
    setUp(cb) {
      this.req = {
        get(key) {
          return this[key];
        },
      };

      cb();
    },

    missingVendorPrefix(test) {
      test.expect(1);

      test.throws(() => {
        version.setByAccept();
      }, 'Middleware instantiated without vendor prefix.');
      test.done();
    },
    default(test) {
      test.expect(4);

      const middleware = version.setByAccept('vnd.test');

      this.req.accept = 'application/vnd.test.v1+json';

      middleware(this.req, {}, () => {
        test.equal(this.req.version, 'v1', 'Version not set correctly by accept header.');
        this.req.accept = 'application/vnd.test.v1.1+json';
        middleware(this.req, {}, () => {
          test.equal(this.req.version, 'v1.1', 'Version not set correctly by accept header.');

          this.req.accept = 'application/vnd.test.v1.1.1+json';
          middleware(this.req, {}, () => {
            test.equal(this.req.version, 'v1.1.1', 'Version not set correctly by accept header.');

            delete this.req.accept;
            delete this.req.version;
            middleware(this.req, {}, () => {
              test.equal(typeof this.req.version, 'undefined');
              test.done();
            });
          });
        });
      });
    },
    withSeparator(test) {
      test.expect(1);

      const middleware = version.setByAccept('vnd.test', '::');
      this.req.accept = 'application/vnd.test::v1+json';

      middleware(this.req, {}, () => {
        test.equal(this.req.version, 'v1', 'Version not set correctly by accept header.');
        test.done();
      });
    },
    withSuffix(test) {
      test.expect(1);

      const middleware = version.setByAccept('vnd.test', undefined, '+xml');
      this.req.accept = 'application/vnd.test.v1+xml';

      middleware(this.req, {}, () => {
        test.equal(this.req.version, 'v1', 'Version not set correctly by accept header.');
        test.done();
      });
    },
  },
  setBySemverAccept: {
    setUp(cb) {
      this.req = {
        get(key) {
          return this[key];
        },
      };

      cb();
    },

    missingSupportedVersions(test) {
      test.expect(1);

      test.throws(() => version.setBySemverAccept(), 'Error not thrown.');
      test.done();
    },
    missingVendorPrefix(test) {
      test.expect(1);

      test.throws(
        () => version.setBySemverAccept(this.supportedVersions),
        'Error not thrown.');
      test.done();
    },
    default(test) {
      test.expect(7);

      const middleware = version.setBySemverAccept(this.supportedVersions, 'vnd.test');

      this.req.accept = 'application/vnd.test.v1+json';

      middleware(this.req, {}, () => {
        test.equal(this.req.origVersion, 'v1', 'Orig version not set correctly by accept header.');
        test.equal(this.req.version, 'v1.0.0', 'Version not set correctly by accept header.');
        delete this.req.origVersion;
        delete this.req.version;
        this.req.accept = 'application/vnd.test.v1.1+json';
        middleware(this.req, {}, () => {
          test.equal(
            this.req.origVersion,
            'v1.1',
            'Orig version not set correctly by accept header.');
          test.equal(
            this.req.version,
            'v1.1.0',
            'Version not set correctly by accept header.');

          delete this.req.origVersion;
          delete this.req.version;
          this.req.accept = 'application/vnd.test.v1.1.1+json';
          middleware(this.req, {}, () => {
            test.equal(
              this.req.origVersion,
              'v1.1.1',
              'Orig version not set correctly by accept header.');
            test.equal(
              this.req.version,
              'v1.1.1',
              'Version not set correctly by accept header.');

            delete this.req.accept;
            delete this.req.version;
            middleware(this.req, {}, () => {
              test.equal(typeof this.req.version, 'undefined');
              test.done();
            });
          });
        });
      });
    },
    withSeparator(test) {
      test.expect(2);

      const middleware = version.setBySemverAccept(this.supportedVersions, 'vnd.test', '::');
      this.req.accept = 'application/vnd.test::v1+json';

      middleware(this.req, {}, () => {
        test.equal(this.req.origVersion, 'v1', 'Orig version not set correctly by accept header.');
        test.equal(this.req.version, 'v1.0.0', 'Version not set correctly by accept header.');
        test.done();
      });
    },
    withSuffix(test) {
      test.expect(2);

      const middleware = version.setBySemverAccept(
        this.supportedVersions,
        'vnd.test',
        undefined,
        '+xml');
      this.req.accept = 'application/vnd.test.v1+xml';

      middleware(this.req, {}, () => {
        test.equal(this.req.origVersion, 'v1', 'Orig version not set correctly by accept header.');
        test.equal(this.req.version, 'v1.0.0', 'Version not set correctly by accept header.');
        test.done();
      });
    },
    exactVersion(test) {
      test.expect(2);
      const middleware = version.setBySemverAccept(this.supportedVersions, 'vnd.test');
      this.req.accept = 'application/vnd.test.v1+json';
      middleware(this.req, {}, () => {
        test.equal(this.req.origVersion, 'v1', 'Unexpected origVersion');
        test.equal(this.req.version, 'v1.0.0', 'Unexpected version');
        test.done();
      });
    },
    hyphenRange(test) {
      test.expect(2);
      const middleware = version.setBySemverAccept(this.supportedVersions, 'vnd.test');
      this.req.accept = 'application/vnd.test.v1 - v2+json';
      middleware(this.req, {}, () => {
        test.equal(this.req.origVersion, 'v1 - v2', 'Unexpected origVersion');
        test.equal(this.req.version, 'v1.1.1', 'Unexpected version');
        test.done();
      });
    },
    xRange(test) {
      test.expect(2);
      const middleware = version.setBySemverAccept(this.supportedVersions, 'vnd.test');
      this.req.accept = 'application/vnd.test.v1.0.x+json';
      middleware(this.req, {}, () => {
        test.equal(this.req.origVersion, 'v1.0.x', 'Unexpected origVersion');
        test.equal(this.req.version, 'v1.0.1', 'Unexpected version');
        test.done();
      });
    },
    tildeRange(test) {
      test.expect(2);
      const middleware = version.setBySemverAccept(this.supportedVersions, 'vnd.test');
      this.req.accept = 'application/vnd.test.~v1.0.0+json';
      middleware(this.req, {}, () => {
        test.equal(this.req.origVersion, '~v1.0.0', 'Unexpected origVersion');
        test.equal(this.req.version, 'v1.0.1', 'Unexpected version');
        test.done();
      });
    },
    caretRange(test) {
      test.expect(2);
      const middleware = version.setBySemverAccept(this.supportedVersions, 'vnd.test');
      this.req.accept = 'application/vnd.test.^v1.0.0+json';
      middleware(this.req, {}, () => {
        test.equal(this.req.origVersion, '^v1.0.0', 'Unexpected origVersion');
        test.equal(this.req.version, 'v1.1.1', 'Unexpected version');
        test.done();
      });
    },
  },
  validate: {
    missingVersions(test) {
      test.expect(3);

      test.throws(() => {
        version.validateVersion();
      }, 'Undefined versions allowed.');
      test.throws(() => {
        version.validateVersion('foo');
      }, 'Non array versions allowed.');
      test.throws(() => {
        version.validateVersion([]);
      }, 'Empty versions allowed.');

      test.done();
    },
    default(test) {
      test.expect(2);

      const middleware = version.validateVersion(['v1', 'v2', 'v3']);

      const req = { version: 'v1' };
      middleware(req, {}, (err) => {
        test.ok(!err, 'Version validated.');

        req.version = 'a1';
        middleware(req, {}, (iErr) => {
          test.equal(iErr.status, 400, 'Error status not set.');
          test.done();
        });
      });
    },
    withMessage(test) {
      test.expect(1);

      const middleware = version.validateVersion(['v1'], 'Whoops');

      const req = { version: 'a1' };
      middleware(req, {}, (err) => {
        test.equal('Whoops', err.message, 'Error message not set.');
        test.done();
      });
    },
  },
};

