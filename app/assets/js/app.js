
/* -------- app/src/js/app.js -------- */ 

'use strict';

// Declare app level module which depends on filters, and services
var app = angular.module('myApp', [
    'ngMaterial',
    'myApp.config',
    'myApp.security',
    'myApp.home',
    'myApp.account',
    'myApp.chat',
    'myApp.login'
  ])

  .run(['$rootScope', 'Auth', function($rootScope, Auth) {
    // track status of authentication
    Auth.$onAuth(function(user) {
      $rootScope.loggedIn = !!user;
    });
  }]);


/* -------- app/src/js/configs/routes.js -------- */ 

app.config(['$routeProvider', function($routeProvider) {
  $routeProvider.whenAuthenticated('/chat', {
    templateUrl: 'templates/chat.html',
    controller: 'ChatCtrl'
  });

  $routeProvider.whenAuthenticated('/account', {
    templateUrl: 'templates/account.html',
    controller: 'AccountCtrl'
  });

  $routeProvider.whenAuthenticated('/settings', {
    templateUrl: 'templates/settings.html',
  });

  $routeProvider.whenAuthenticated('/settings/categories', {
    templateUrl: 'templates/categories.html'
  });

  $routeProvider.whenAuthenticated('/settings/categories/create', {
    templateUrl: 'templates/categories/create.html'
  });

  $routeProvider.whenAuthenticated('/settings/subcategories', {
    templateUrl: 'templates/subcategories/index.html',
  });

  $routeProvider.whenAuthenticated('/settings/subcategories/create', {
    templateUrl: 'templates/subcategories/create.html',
  });

  $routeProvider.whenAuthenticated('/companies', {
    templateUrl: 'templates/companies/list.html',
  });

  $routeProvider.whenAuthenticated('/companies/company', {
    templateUrl: 'templates/companies/single.html',
  });

  $routeProvider.whenAuthenticated('/home', {
    templateUrl: 'templates/home.html',
    controller: 'HomeCtrl',
    resolve: {
      // forces the page to wait for this promise to resolve before controller is loaded
      // the controller can then inject `user` as a dependency. This could also be done
      // in the controller, but this makes things cleaner (controller doesn't need to worry
      // about auth status or timing of accessing data or displaying elements)
      user: ['Auth', function (Auth) {
        return Auth.$waitForAuth();
      }]
    }
  });

  $routeProvider.when('/login', {
    controller: 'LoginCtrl',
    templateUrl: 'templates/login.html'
  });

}]);

/* -------- app/src/js/controllers/account.js -------- */ 

(function (angular) {
  "use strict";

  var app = angular.module('myApp.account', ['firebase', 'firebase.utils', 'firebase.auth', 'ngRoute']);

  app.controller('AccountCtrl', ['$scope', 'Auth', 'fbutil', 'user', '$location', '$firebaseObject',
    function($scope, Auth, fbutil, user, $location, $firebaseObject) {
      var unbind;
      // create a 3-way binding with the user profile object in Firebase
      var profile = $firebaseObject(fbutil.ref('users', user.uid));
      profile.$bindTo($scope, 'profile').then(function(ub) { unbind = ub; });

      // expose logout function to scope
      $scope.logout = function() {
        if( unbind ) { unbind(); }
        profile.$destroy();
        Auth.$unauth();
        $location.path('/login');
      };

      $scope.changePassword = function(pass, confirm, newPass) {
        resetMessages();
        if( !pass || !confirm || !newPass ) {
          $scope.err = 'Please fill in all password fields';
        }
        else if( newPass !== confirm ) {
          $scope.err = 'New pass and confirm do not match';
        }
        else {
          Auth.$changePassword({email: profile.email, oldPassword: pass, newPassword: newPass})
            .then(function() {
              $scope.msg = 'Password changed';
            }, function(err) {
              $scope.err = err;
            })
        }
      };

      $scope.clear = resetMessages;

      $scope.changeEmail = function(pass, newEmail) {
        resetMessages();
        var oldEmail = profile.email;
        Auth.$changeEmail({oldEmail: oldEmail, newEmail: newEmail, password: pass})
          .then(function() {
            // store the new email address in the user's profile
            return fbutil.handler(function(done) {
              fbutil.ref('users', user.uid, 'email').set(newEmail, done);
            });
          })
          .then(function() {
            $scope.emailmsg = 'Email changed';
          }, function(err) {
            $scope.emailerr = err;
          });
      };

      function resetMessages() {
        $scope.err = null;
        $scope.msg = null;
        $scope.emailerr = null;
        $scope.emailmsg = null;
      }
    }
  ]);

})(angular);

/* -------- app/src/js/controllers/appversion-directive.js -------- */ 

'use strict';

/* Directives */


angular.module('myApp')

  .directive('appVersion', ['version', function(version) {
    return function(scope, elm) {
      elm.text(version);
    };
  }]);


/* -------- app/src/js/controllers/auth.js -------- */ 

angular.module('firebase.auth', ['firebase', 'firebase.utils'])
  .factory('Auth', ['$firebaseAuth', 'fbutil', function($firebaseAuth, fbutil) {
    return $firebaseAuth(fbutil.ref());
  }]);


/* -------- app/src/js/controllers/categories.js -------- */ 



/* -------- app/src/js/controllers/chat.js -------- */ 

(function (angular) {
  "use strict";

  var app = angular.module('myApp.chat', ['ngRoute', 'firebase.utils', 'firebase']);

  app.controller('ChatCtrl', ['$scope', 'messageList', function($scope, messageList) {
      $scope.messages = messageList;
      $scope.addMessage = function(newMessage) {
        if( newMessage ) {
          $scope.messages.$add({text: newMessage});
        }
      };
    }]);

})(angular);

/* -------- app/src/js/controllers/config.js -------- */ 

'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp.config', [])

  // version of this seed app is compatible with angularFire 1.0.0
  // see tags for other versions: https://github.com/firebase/angularFire-seed/tags
  .constant('version', '1.0.0')

  // where to redirect users if they need to authenticate (see security.js)
  .constant('loginRedirectPath', '/login')

  // your Firebase data URL goes here, no trailing slash
  .constant('FBURL', 'https://klostermark.firebaseio.com')

  // double check that the app has been configured before running it and blowing up space and time
  .run(['FBURL', '$timeout', function(FBURL, $timeout) {
    if( FBURL.match('//INSTANCE.firebaseio.com') ) {
      angular.element(document.body).html('<h1>Please configure app/config.js before running!</h1>');
      $timeout(function() {
        angular.element(document.body).removeClass('hide');
      }, 250);
    }
  }]);



/* -------- app/src/js/controllers/firebase.utils.js -------- */ 


// a simple wrapper on Firebase and AngularFire to simplify deps and keep things DRY
angular.module('firebase.utils', ['firebase', 'myApp.config'])
   .factory('fbutil', ['$window', 'FBURL', '$q', function($window, FBURL, $q) {
      "use strict";

      var utils = {
        // convert a node or Firebase style callback to a future
        handler: function(fn, context) {
          return utils.defer(function(def) {
            fn.call(context, function(err, result) {
              if( err !== null ) { def.reject(err); }
              else { def.resolve(result); }
            });
          });
        },

        // abstract the process of creating a future/promise
        defer: function(fn, context) {
          var def = $q.defer();
          fn.call(context, def);
          return def.promise;
        },

        ref: firebaseRef
      };

      return utils;

      function pathRef(args) {
        for (var i = 0; i < args.length; i++) {
          if (angular.isArray(args[i])) {
            args[i] = pathRef(args[i]);
          }
          else if( typeof args[i] !== 'string' ) {
            throw new Error('Argument '+i+' to firebaseRef is not a string: '+args[i]);
          }
        }
        return args.join('/');
      }

      /**
       * Example:
       * <code>
       *    function(firebaseRef) {
         *       var ref = firebaseRef('path/to/data');
         *    }
       * </code>
       *
       * @function
       * @name firebaseRef
       * @param {String|Array...} path relative path to the root folder in Firebase instance
       * @return a Firebase instance
       */
      function firebaseRef(path) {
        var ref = new $window.Firebase(FBURL);
        var args = Array.prototype.slice.call(arguments);
        if( args.length ) {
          ref = ref.child(pathRef(args));
        }
        return ref;
      }
   }]);



/* -------- app/src/js/controllers/home.js -------- */ 

(function(angular) {
  "use strict";

  var app = angular.module('myApp.home', ['firebase.auth', 'firebase', 'firebase.utils', 'ngRoute']);

  app.controller('HomeCtrl', ['$scope', 'fbutil', 'user', '$firebaseObject', 'FBURL', function ($scope, fbutil, user, $firebaseObject, FBURL) {
    $scope.syncedValue = $firebaseObject(fbutil.ref('syncedValue'));
    $scope.user = user;
    $scope.FBURL = FBURL;
  }]);

})(angular);



/* -------- app/src/js/controllers/login.js -------- */ 

"use strict";
angular.module('myApp.login', ['firebase.utils', 'firebase.auth', 'ngRoute'])

  .controller('LoginCtrl', ['$scope', 'Auth', '$location', 'fbutil', function($scope, Auth, $location, fbutil) {
    $scope.email = null;
    $scope.pass = null;
    $scope.confirm = null;
    $scope.createMode = false;

    $scope.login = function(email, pass) {
      $scope.err = null;
      Auth.$authWithPassword({ email: email, password: pass }, {rememberMe: true})
        .then(function(/* user */) {
          $location.path('/account');
        }, function(err) {
          $scope.err = errMessage(err);
        });
    };

    $scope.createAccount = function() {
      $scope.err = null;
      if( assertValidAccountProps() ) {
        var email = $scope.email;
        var pass = $scope.pass;
        // create user credentials in Firebase auth system
        Auth.$createUser({email: email, password: pass})
          .then(function() {
            // authenticate so we have permission to write to Firebase
            return Auth.$authWithPassword({ email: email, password: pass });
          })
          .then(function(user) {
            // create a user profile in our data store
            var ref = fbutil.ref('users', user.uid);
            return fbutil.handler(function(cb) {
              ref.set({email: email, name: name||firstPartOfEmail(email)}, cb);
            });
          })
          .then(function(/* user */) {
            // redirect to the account page
            $location.path('/account');
          }, function(err) {
            $scope.err = errMessage(err);
          });
      }
    };

    function assertValidAccountProps() {
      if( !$scope.email ) {
        $scope.err = 'Please enter an email address';
      }
      else if( !$scope.pass || !$scope.confirm ) {
        $scope.err = 'Please enter a password';
      }
      else if( $scope.createMode && $scope.pass !== $scope.confirm ) {
        $scope.err = 'Passwords do not match';
      }
      return !$scope.err;
    }

    function errMessage(err) {
      return angular.isObject(err) && err.code? err.code : err + '';
    }

    function firstPartOfEmail(email) {
      return ucfirst(email.substr(0, email.indexOf('@'))||'');
    }

    function ucfirst (str) {
      // inspired by: http://kevin.vanzonneveld.net
      str += '';
      var f = str.charAt(0).toUpperCase();
      return f + str.substr(1);
    }
  }]);

/* -------- app/src/js/controllers/ngcloak-decorator.js -------- */ 


/**
 * Wraps ng-cloak so that, instead of simply waiting for Angular to compile, it waits until
 * Auth resolves with the remote Firebase services.
 *
 * <code>
 *    <div ng-cloak>Authentication has resolved.</div>
 * </code>
 */
angular.module('myApp')
  .config(['$provide', function($provide) {
    // adapt ng-cloak to wait for auth before it does its magic
    $provide.decorator('ngCloakDirective', ['$delegate', 'Auth',
      function($delegate, Auth) {
        var directive = $delegate[0];
        // make a copy of the old directive
        var _compile = directive.compile;
        directive.compile = function(element, attr) {
          Auth.$waitForAuth().then(function() {
            // after auth, run the original ng-cloak directive
            _compile.call(directive, element, attr);
          });
        };
        // return the modified directive
        return $delegate;
      }]);
  }]);

/* -------- app/src/js/controllers/security.js -------- */ 

(function (angular) {
  "use strict";

  // when $routeProvider.whenAuthenticated() is called, the path is stored in this list
  // to be used by authRequired() in the services below
  var securedRoutes = [];

  angular.module('myApp.security', ['ngRoute', 'firebase.auth', 'myApp.config'])

    .config(['$routeProvider', function ($routeProvider) {
      // routes which are not in our map are redirected to /home
      //$routeProvider.otherwise({redirectTo: '/home'});
    }])

  /**
   * Adds a special `whenAuthenticated` method onto $routeProvider. This special method,
   * when called, waits for auth status to be resolved asynchronously, and then fails/redirects
   * if the user is not properly authenticated.
   *
   * The promise either resolves to the authenticated user object and makes it available to
   * dependency injection (see AuthCtrl), or rejects the promise if user is not logged in,
   * forcing a redirect to the /login page
   */
    .config(['$routeProvider', function ($routeProvider) {
      // credits for this idea: https://groups.google.com/forum/#!msg/angular/dPr9BpIZID0/MgWVluo_Tg8J
      // unfortunately, a decorator cannot be use here because they are not applied until after
      // the .config calls resolve, so they can't be used during route configuration, so we have
      // to hack it directly onto the $routeProvider object
      $routeProvider.whenAuthenticated = function (path, route) {
        securedRoutes.push(path); // store all secured routes for use with authRequired() below
        route.resolve = route.resolve || {};
        route.resolve.user = ['Auth', function (Auth) {
          return Auth.$requireAuth();
        }];
        $routeProvider.when(path, route);
        return this;
      }
    }])

  /**
   * Apply some route security. Any route's resolve method can reject the promise with
   * { authRequired: true } to force a redirect. This method enforces that and also watches
   * for changes in auth status which might require us to navigate away from a path
   * that we can no longer view.
   */
    .run(['$rootScope', '$location', 'Auth', 'loginRedirectPath',
      function ($rootScope, $location, Auth, loginRedirectPath) {
        // watch for login status changes and redirect if appropriate
        Auth.$onAuth(check);

        // some of our routes may reject resolve promises with the special {authRequired: true} error
        // this redirects to the login page whenever that is encountered
        $rootScope.$on("$routeChangeError", function (e, next, prev, err) {
          if (err === "AUTH_REQUIRED") {
            $location.path(loginRedirectPath);
          }
        });

        function check(user) {
          if (!user && authRequired($location.path())) {
            console.log('check failed', user, $location.path()); //debug
            $location.path(loginRedirectPath);
          }
        }

        function authRequired(path) {
          console.log('authRequired?', path, securedRoutes.indexOf(path)); //debug
          return securedRoutes.indexOf(path) !== -1;
        }
      }
    ]);

})(angular);


/* -------- app/src/js/filters/reverse-filter.js -------- */ 

'use strict';

/* Filters */

angular.module('myApp')
  .filter('reverse', function() {
    return function(items) {
      return items.slice().reverse();
    };
  });

/* -------- app/src/js/services/factories.js -------- */ 

app.factory('messageList', ['fbutil', '$firebaseArray', function(fbutil, $firebaseArray) {
  var ref = fbutil.ref('messages').limitToLast(10);
  return $firebaseArray(ref);
}]);

app.factory('categoryList', ['fbutil', '$firebaseArray', function(fbutil, $firebaseArray) {
  var ref = fbutil.ref('categories').limitToLast(10);
  return $firebaseArray(ref);
}]);