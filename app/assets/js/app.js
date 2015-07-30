
/* -------- app/src/js/app.js -------- */ 

'use strict';

// Declare app level module which depends on filters, and services
var app = angular.module('myApp', [
    'myApp.config',
    'myApp.security',
    'myApp.mainController',
    'myApp.home',
    'myApp.account',
    'myApp.login',
    'myApp.categories',
    'myApp.tasks',
    'myApp.companies',
    'firebase', // temp
    'ngMaterial'   // temp
  ])

  .run(['$rootScope', 'Auth', function($rootScope, Auth) {
    // track status of authentication
    Auth.$onAuth(function(user) {
      $rootScope.loggedIn = !!user;
    });
  }]);


/* -------- app/src/js/configs/config.js -------- */ 

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




/* -------- app/src/js/configs/ngcloak-decorator.js -------- */ 


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


/* -------- app/src/js/configs/routes.js -------- */ 

app.config(['$routeProvider', function($routeProvider) {

  $routeProvider
  .whenAuthenticated('/account', {
    templateUrl: 'templates/account.html',
    controller: 'AccountCtrl'
  })
  .whenAuthenticated('/settings', {
    templateUrl: 'templates/settings.html',
  })
  .whenAuthenticated('/settings/categories', {
    templateUrl: 'templates/categories/index.html',
    controller: 'CategoriesCtrl',
  })
  .whenAuthenticated('/settings/categories/:id', {
    templateUrl: 'templates/categories/category.html',
    controller: 'CategoryCtrl',
  })
  .whenAuthenticated('/settings/tasks', {
    templateUrl: 'templates/tasks/index.html',
    controller: 'TasksCtrl',
  })
  .whenAuthenticated('/settings/tasks/:id', {
    templateUrl: 'templates/tasks/task.html',
    controller: 'TaskCtrl',
  })
  .whenAuthenticated('/companies', {
    templateUrl: 'templates/companies/index.html',
    controller: 'CompaniesCtrl'
  })
  .whenAuthenticated('/companies/:id', {
    templateUrl: 'templates/companies/company.html',
    controller: 'CompanyCtrl',
  })
  .whenAuthenticated('/companies/:id/edit', {
    templateUrl: 'templates/companies/edit.html',
    controller: 'EditCompanyCtrl'
  })
  .whenAuthenticated('/home', {
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
  })
  .when('/login', {
    controller: 'LoginCtrl',
    templateUrl: 'templates/login.html'
  })
  .otherwise({
    templateUrl: 'templates/404.html'
  })

}]);


/* -------- app/src/js/configs/security.js -------- */ 

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


/* -------- app/src/js/controllers/categories/category.js -------- */ 



/* -------- app/src/js/controllers/categories/index.js -------- */ 

(function (angular) {
  "use strict";

  var app = angular.module('myApp.categories', ['ngRoute', 'firebase.utils', 'firebase', 'ngMaterial', 'ngMessages']);

  app.controller('CategoriesCtrl', [
    '$scope',
    'categoriesFactory',
    '$mdDialog',
    function($scope, categoriesFactory, $mdDialog) {

      $scope.ObjectKeys = Object.keys;

      // loader active in the beginning
      $scope.fetchingData = true;

      // fetch categories
      $scope.categories = categoriesFactory.all();

      // data loaded, kill spinner
      $scope.categories.$loaded().then(function () {
        $scope.fetchingData = false;
      })

      $scope.add = function () {
        // call modal into existance
        $mdDialog.show({
          controller: 'NewCategoryCtrl',
          templateUrl: 'templates/dialogs/new-category.html',
          parent: angular.element(document.body)
        })
      }


    }]);

})(angular);

(function (angular) {
  "use strict";

  angular
  .module('myApp.categories')
  .controller('CategoryCtrl', [
    '$scope',
    '$routeParams',
    'categoriesFactory',
    function($scope, $routeParams, categoriesFactory) {

      var id = $routeParams.id;

      $scope.status = 'pristine';

      $scope.category = categoriesFactory.get(id);

      $scope.submit = function (form) {
        
        if (form.$valid) {
          $scope.status = 'submitting';

          $scope.category
          .$save().then(function () {
            $scope.status = 'submitted';
            form.$setPristine();
          });

        } else {
          $scope.status = 'invalid';
        }

      }

    }]);

})(angular);


/* -------- app/src/js/controllers/categories/new.js -------- */ 

(function (angular) {
  "use strict";

  angular
  .module('myApp.categories')
  .controller('NewCategoryCtrl', [
    '$scope',
    'categoriesFactory',
    '$mdDialog',
    function($scope, categoriesFactory, $mdDialog) {

      $scope.subtmitting = false;
      $scope.invalid = false; 

      $scope.cancel = function () {
        $mdDialog.cancel();
      }

      $scope.submit = function (form) {
        if (form.$valid) {
          $scope.invalid = false;
          $scope.submitting = true;

          categoriesFactory
          .all()
          .$add({
            name: $scope.category.name
          })
          .then(function () {
            // data submitted succesfully
            $scope.submitting = false;
            $mdDialog.hide();
          });

        } else {
          // form not valid
          $scope.invalid = true;
        }

      }

    }]);

})(angular);


/* -------- app/src/js/controllers/companies/company.js -------- */ 



/* -------- app/src/js/controllers/companies/index.js -------- */ 

(function (angular) {
  "use strict";

  var app = angular.module('myApp.companies', ['ngRoute', 'firebase.utils', 'firebase', 'ngMaterial', 'ngMessages']);

  app.controller('CompaniesCtrl', [
    '$scope',
    'companiesFactory',
    '$mdDialog',
    function($scope, companiesFactory, $mdDialog) {

      // loader active in the beginning
      $scope.fetchingData = true;

      // fetch tasks
      $scope.companies = companiesFactory.all();

      // data loaded, kill spinner
      $scope.companies.$loaded().then(function () {
        $scope.fetchingData = false;
      })

      $scope.add = function () {
        // call modal into existance
        $mdDialog.show({
          controller: 'NewCompanyCtrl',
          templateUrl: 'templates/dialogs/new-company.html',
          parent: angular.element(document.body)
        })
      }


    }]);

})(angular);

(function (angular) {
  "use strict";

  angular
  .module('myApp.companies')
  .controller('CompanyCtrl', [
    '$scope',
    '$routeParams',
    'joinForCompanyService',
    'activitiesFactory',
    '$mdDialog',
    '$mdToast',
    function($scope, $routeParams, joinForCompanyService, activitiesFactory, $mdDialog, $mdToast) {

      var
        self = this,
        companyId = $routeParams.id;
      
      $scope.company = {};
      $scope.activities = {};
      $scope.dateSelected = false;
      $scope.loadingActivities = true;

      
      joinForCompanyService.watch(companyId, function (company) {
        $scope.company = company;
        !! $scope.$$phase || $scope.$apply();
      });

      $scope.activityChange = function (taskId) {
        // remove falsy activity tasks
        $scope.activities[taskId] || delete $scope.activities[taskId];

        // sync
        $scope.activities.$save().then(function () {
          $mdToast.show({
            controller: 'toastCtrl',
            templateUrl: 'templates/toasts/activity-synced.html',
            hideDelay: 2000,
            position: 'top right fit'
          });
        });
      }

      $scope.loadActivities = function (date) {
        var time;
        if (date) {
          // user has selected a date
          time = new Date(date).getTime()

          $scope.activities = activitiesFactory.get([time, companyId]);

          // disable checkboxes intill loaded
          $scope.loadingActivities = true;

          $scope.activities.$loaded().then(function (ref) {
            // show data
            $scope.dateSelected = true;

            // make checkboxes available
            $scope.loadingActivities = false;
          })
        } else {
          // hide data
          $scope.dateSelected = false;
        }
      }

      $scope.showDescription = function (task) {
        $mdDialog.show(
          $mdDialog.alert()
            .title('Momentbeskrivning')
            .content(task.description)
            .ariaLabel('Momentbeskrivning')
            .ok('Förstått')
        );
      }

      $scope.showNotification = function (task) {
        $mdDialog.show(
          $mdDialog.alert()
            .title('Rutinförändring')
            .content(task.notification.description)
            .ariaLabel('Rutinförändring')
            .ok('Förstått')
        );
      }   

    }]);

})(angular);


/* -------- app/src/js/controllers/companies/edit-company.js -------- */ 


(function (angular) {
  "use strict";

  angular
  .module('myApp.companies')
  .controller('EditCompanyCtrl', [
    '$scope',
    '$routeParams',
    'companiesFactory',
    'categoriesFactory',
    function($scope, $routeParams, companiesFactory, categoriesFactory) {

      var
        self = this,
        id = $routeParams.id;

      $scope.status = 'pristine';
      $scope.companyCategories = [];

      // fetch data
      $scope.company = companiesFactory.get(id);
      $scope.categories = categoriesFactory.all();

      
      // watch for fully loaded data
      $scope.company.$watch(function () {
        self.fetched('company');
      })
      $scope.categories.$watch(function () {
        self.fetched('categories');
      })

      // wait so all data is fetched
      this.keepTrack = ['company', 'categories'];
      this.fetched = function (data) {
        var i = this.keepTrack.indexOf(data);

        if (i > -1) {
          this.keepTrack.splice(i, 1);
        }

        if (this.keepTrack.length === 0) {
          $scope.fetched = true;
          // display categories used by company
          $scope.companyCategories = this.matchCompanyCategories();
        }
      }

      $scope.removeChip = function (chip, form) {
        if ($scope.company.categories) {
          delete $scope.company.categories[chip.$id];
        }

        // make form dirty
        form.$setDirty();
      }

      this.matchCompanyCategories = function () {
        var
          categoryId, i,
          companyCategories = [];

        for (categoryId in $scope.company.categories) {
          for (i = 0; i < $scope.categories.length; i++) {
            if (categoryId === $scope.categories[i].$id) {
              companyCategories.push($scope.categories[i]);
              break;
            }
          }
        }

        return companyCategories;
      }

      $scope.filterCategories = function (match) {
        var
          i,
          categoriesArray = []

        // filter
        for (i = 0; i < $scope.categories.length; i++) {
          if ($scope.categories[i].name.toLowerCase().indexOf(match.toLowerCase()) > -1) {
            categoriesArray.push($scope.categories[i]);
          }
        }

        return categoriesArray;
      }

      $scope.addCategory = function (category) {
        // add category id to company categories
        if (! $scope.company.categories) {
          $scope.company.categories = {}
        }

        $scope.company.categories[category.$id] = true;
      }

      $scope.submit = function (form) {
        var notificationId;
        
        if (form.$valid) {
          $scope.status = 'submitting';

          // update company
          $scope.company.$save().then(function () {
            $scope.status = 'submitted';
            form.$setPristine();
          });

        } else {
          $scope.status = 'invalid';
        }

      }

    }]);

})(angular);


/* -------- app/src/js/controllers/companies/new.js -------- */ 

(function (angular) {
  "use strict";

  angular
  .module('myApp.companies')
  .controller('NewCompanyCtrl', [
    '$scope',
    'companiesFactory',
    '$mdDialog',
    function($scope, companiesFactory, $mdDialog) {

      $scope.subtmitting = false;
      $scope.invalid = false; 

      $scope.cancel = function () {
        $mdDialog.cancel();
      }

      $scope.submit = function (form) {
        if (form.$valid) {
          $scope.invalid = false;
          $scope.submitting = true;

          companiesFactory
          .all()
          .$add({
            name: $scope.company.name
          })
          .then(function () {
            // data submitted succesfully
            $scope.submitting = false;
            $mdDialog.hide();
          });

        } else {
          // form not valid
          $scope.invalid = true;
        }

      }

    }]);

})(angular);


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


/* -------- app/src/js/controllers/main.js -------- */ 

(function (angular) {
  "use strict";

  var app = angular.module('myApp.mainController', ['ngRoute']);

  app.controller('mainCtrl', [
    '$scope',
    '$rootScope',
    '$location',
    function($scope, $rootScope, $location) {

      $rootScope.navigate = function (path) {
        $location.path(path);
      }

    }]);

})(angular);


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



/* -------- app/src/js/controllers/sidenav.js -------- */ 

app.controller('NavController', function($scope, $mdSidenav) {
  $scope.openLeftMenu = function() {
    $mdSidenav('left').toggle();
  };
});



/* -------- app/src/js/controllers/tasks/index.js -------- */ 

(function (angular) {
  "use strict";

  var app = angular.module('myApp.tasks', ['ngRoute', 'firebase.utils', 'firebase', 'ngMaterial', 'ngMessages']);

  app.controller('TasksCtrl', [
    '$scope',
    'tasksFactory',
    '$mdDialog',
    function($scope, tasksFactory, $mdDialog) {

      // loader active in the beginning
      $scope.fetchingData = true;

      // fetch tasks
      $scope.tasks = tasksFactory.all();

      // data loaded, kill spinner
      $scope.tasks.$loaded().then(function () {
        $scope.fetchingData = false;
      })

      $scope.add = function () {
        // call modal into existance
        $mdDialog.show({
          controller: 'NewTaskCtrl',
          templateUrl: 'templates/dialogs/new-task.html',
          parent: angular.element(document.body)
        })
      }


    }]);

})(angular);


/* -------- app/src/js/controllers/tasks/new.js -------- */ 

(function (angular) {
  "use strict";

  angular
  .module('myApp.categories')
  .controller('NewTaskCtrl', [
    '$scope',
    'tasksFactory',
    '$mdDialog',
    function($scope, tasksFactory, $mdDialog) {

      $scope.subtmitting = false;
      $scope.invalid = false; 

      $scope.cancel = function () {
        $mdDialog.cancel();
      }

      $scope.submit = function (form) {
        if (form.$valid) {
          $scope.invalid = false;
          $scope.submitting = true;

          tasksFactory
          .all()
          .$add({
            name: $scope.task.name
          })
          .then(function () {
            // data submitted succesfully
            $scope.submitting = false;
            $mdDialog.hide();
          });

        } else {
          // form not valid
          $scope.invalid = true;
        }

      }

    }]);

})(angular);


/* -------- app/src/js/controllers/tasks/task.js -------- */ 

(function (angular) {
  "use strict";

  angular
  .module('myApp.tasks')
  .controller('TaskCtrl', [
    '$scope',
    '$routeParams',
    'tasksFactory',
    'notificationsFactory',
    'categoriesFactory',
    function($scope, $routeParams, tasksFactory, notificationsFactory, categoriesFactory) {

      var
        self = this,
        taskId = $routeParams.id;

      $scope.status = 'pristine';
      $scope.routine = {};
      $scope.category = {};

      // fetch data
      $scope.task = tasksFactory.get(taskId);
      $scope.categories = categoriesFactory.all();

      // watch for fully loaded data
      $scope.task.$watch(function () {
        self.fetched();
      })
      $scope.categories.$watch(function () {
        self.fetched();
      })

      // wait so all data is fetched
      this.fetched = function () {
        this.fetchedProgress = this.fetchedProgress === undefined ? 0 : this.fetchedProgress + 1;

        if (this.fetchedProgress >= 2) {
          $scope.fetched = true;
          // issue#2
          $scope.category = this.getCategory();
        }
      }

      this.getCategory = function () {
        var i;

        for (i = 0; i < $scope.categories.length; i++) {
          if ($scope.categories[i].$id === $scope.task.category) {
            return $scope.categories[i];
          }
        }
      }

      $scope.filterCategories = function (match) {
        var
          i,
          categoriesArray = []

        // filter
        for (i = 0; i < $scope.categories.length; i++) {
          if ($scope.categories[i].name.toLowerCase().indexOf(match.toLowerCase()) > -1) {
            categoriesArray.push($scope.categories[i]);
          }
        }

        return categoriesArray;
      }

      $scope.selectedCategory = function (category) {
        // add category to task
        $scope.task.category = category.$id;
        // update $scope.category
        $scope.category = category;
      }

      $scope.submit = function (form) {
        var i, notificationId, category, saveElement;
        
        if (form.$valid && $scope.task.category && $scope.task.category.length) {
          $scope.status = 'submitting';

          // update categories
          for (i = 0; i < $scope.categories.length; i++) {
            category = $scope.categories[i];
            saveElement = false;
            
            if (category.$id === $scope.category.$id) {
              // add current task to chosen category
              if ( ! category.tasks) {
                category.tasks = {};
              }
              category.tasks[taskId] = true;

              saveElement = true;
            } else if (category.tasks && category.tasks[taskId]) {
              // remove current task from every other category
              delete category.tasks[taskId]
              saveElement = true;
            }

            if (saveElement) {
              $scope.categories.$save(i).catch(function (error) {
                alert('Något gick fel... :(');
                  console.log(error);
              });
            }
          }

          // save routine
          if ($scope.routine.changed) {
            // the routine has changed
            notificationId = notificationsFactory.push({
              taskId: taskId,
              description: $scope.routine.description,
              timestamp: Firebase.ServerValue.TIMESTAMP
            });

            // add notification id to task
            if ( ! $scope.task.notifications) {
              $scope.task.notifications = {};
            }
            $scope.task.notifications[notificationId] = true;
          }

          // update task
          $scope.task.$save().then(function () {
            $scope.status = 'submitted';
            form.$setPristine();
          });

        } else {
          $scope.status = 'invalid';
        }

      }

    }]);

})(angular);


/* -------- app/src/js/controllers/toast.js -------- */ 

(function (angular) {
  "use strict";

  angular.module('myApp')
  .controller('toastCtrl', [
    '$scope',
    '$mdToast',
    function($scope, $mdToast) {

      $scope.closeToast = function() {
        $mdToast.hide();
      };

    }]);

})(angular);


/* -------- app/src/js/directives/appversion-directive.js -------- */ 

'use strict';

/* Directives */


angular.module('myApp')

  .directive('appVersion', ['version', function(version) {
    return function(scope, elm) {
      elm.text(version);
    };
  }]);



/* -------- app/src/js/filters/reverse-filter.js -------- */ 

'use strict';

/* Filters */

angular.module('myApp')
  .filter('reverse', function() {
    return function(items) {
      return items.slice().reverse();
    };
  });


/* -------- app/src/js/services/factories/firebase/activities.js -------- */ 

angular
.module('myApp')
.factory('activitiesFactory', [
  'fbutil',
  '$firebaseArray',
  '$firebaseObject',
  'FBURL',
  function(fbutil, $firebaseArray, $firebaseObject, FBURL) {


    var
      url = FBURL + '/activities',
      ref = new Firebase(url),
      methods = {};

    methods.all = function () {
      return $firebaseArray(ref);
    }

    methods.get = function (ids) {
      var i, childRef, id;

      if (! Array.isArray(ids)) {
        ids = [ids];
      }

      childRef = ref;
      for (i in ids) {
        id = ids[i];
        childRef = childRef.child(id);
      }

      return $firebaseObject(childRef);
    }

    return methods;

  }]);


/* -------- app/src/js/services/factories/firebase/auth.js -------- */ 

angular.module('firebase.auth', ['firebase', 'firebase.utils'])
  .factory('Auth', ['$firebaseAuth', 'fbutil', function($firebaseAuth, fbutil) {
    return $firebaseAuth(fbutil.ref());
  }]);



/* -------- app/src/js/services/factories/firebase/categories.js -------- */ 

angular
.module('myApp')
.factory('categoriesFactory', [
  'fbutil',
  '$firebaseArray',
  '$firebaseObject',
  'FBURL',
  function(fbutil, $firebaseArray, $firebaseObject, FBURL) {


    var
      url = FBURL + '/categories',
      ref = new Firebase(url),
      methods = {};

    methods.all = function () {
      return $firebaseArray(ref);
    }

    methods.get = function (id) {
      return $firebaseObject(ref.child(id));
    }

    methods.push = function (data) {
      ref.push(data);
    }

    return methods;

  }]);


/* -------- app/src/js/services/factories/firebase/companies.js -------- */ 

angular
.module('myApp')
.factory('companiesFactory', [
  'fbutil',
  '$firebaseArray',
  '$firebaseObject',
  'FBURL',
  function(fbutil, $firebaseArray, $firebaseObject, FBURL) {


    var
      url = FBURL + '/companies',
      ref = new Firebase(url),
      methods = {};

    methods.all = function () {
      return $firebaseArray(ref);
    }

    methods.get = function (id) {
      return $firebaseObject(ref.child(id));
    }

    return methods;

  }]);


/* -------- app/src/js/services/factories/firebase/firebase.utils.js -------- */ 


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




/* -------- app/src/js/services/factories/firebase/notifications.js -------- */ 

angular
.module('myApp')
.factory('notificationsFactory', [
  'fbutil',
  '$firebaseArray',
  '$firebaseObject',
  'FBURL',
  function(fbutil, $firebaseArray, $firebaseObject, FBURL) {


    var
      refNotifications = new Firebase(FBURL + '/notifications'),
      methods = {};

    methods.push = function (data) {
      var ref = refNotifications.push(data);
      // return generated id
      return ref.path.pieces_[1];
    }

    return methods;

  }]);


/* -------- app/src/js/services/factories/firebase/tasks.js -------- */ 

angular
.module('myApp')
.factory('tasksFactory', [
  'fbutil',
  '$firebaseArray',
  '$firebaseObject',
  'FBURL',
  function(fbutil, $firebaseArray, $firebaseObject, FBURL) {


    var
      refTasks = new Firebase(FBURL + '/tasks'),
      methods = {};

    methods.all = function () {
      return $firebaseArray(refTasks);
    }

    methods.get = function (id) {
      return $firebaseObject(refTasks.child(id));
    }

    return methods;

  }]);


/* -------- app/src/js/services/serives/firebase/join-for-company.js -------- */ 

angular
.module('myApp')
.service('joinForCompanyService', [
  '$timeout',
  'FBURL',
  function($timeout, FBURL) {

    var
      executeCallback,
      checkPending,
      onCompanyChange,
      onCategoryChange,
      onTaskChange,
      onNotificationChange,
      self = this,
      pending = {
        requests: 0,
        incr: function(where) {
          // console.log(where, pending.requests, '++')
          pending.requests++;
        },
        decr: function (where) {
          if (pending.requests > 0) {
            // console.log(where, pending.requests, '--')

            pending.requests--;

            if (pending.requests === 0) {
              executeCallback();
            }
          }
        }
      },
      fburl = {
        company: function(id) {return FBURL + '/companies/' + id},
        category: function (id) {return FBURL + '/categories/' + id},
        task: function (id) {return FBURL + '/tasks/' + id},
        notification: function (id) {return FBURL + '/notifications/' + id},
      },
      fbref = {
        company: null,
        categories: {},
        tasks: {},
        notifications: {},
      //   clear: function (refSets) {
      //     var i, j, key, refSet;

      //     // each set
      //     for (i in refSets) {
      //       key = refSets[i];
      //       refSet = fbref[key];

      //       if (refSet) {
      //         for (j in refSet) {
      //           //console.log(j)
      //         }
      //       }

      //     }
      //   }
      },
      company = {};

    this.deferExe;

    onCompanyChange = function (snap) {
      company = snap.val();

      // kill all fb refs bellow company
      // fbref.clear(['categories', 'tasks', 'notifications']);
      // fbref.categories = {};
      // fbref.tasks = {};
      // fbref.notifications = {};

      if ( snap.child('categories').exists() ) {
        snap.child('categories').forEach(function (category) {
          var
            categoryId = category.key(),
            categoryUrl = fburl.category(categoryId);

          // increment pending requests
          pending.incr('category');

          // ref
          fbref.categories[categoryId] = new Firebase(categoryUrl);

          // listener
          fbref.categories[categoryId].once('value', function (snap) {
            onCategoryChange(snap);

            // decrement pending requests
            pending.decr('category');
          });
        });
      }
    }

    onCategoryChange = function (snap) {

      //console.log('onCategoryChange', pending.requests)

      var
        categoryId = snap.key(),
        categories = company.categories;

      // kill all fb refs bellow categories
      // fbref.clear(['tasks', 'notifications']);
      // fbref.tasks = {};
      // fbref.notifications = {};

      categories[categoryId] = snap.val();

      if ( snap.child('tasks').exists() ) {
        snap.child('tasks').forEach(function (task) {
          var
            taskId = task.key(),
            taskUrl = fburl.task(taskId);

          // increment pending requests
          pending.incr('taks');

          // ref
          fbref.tasks[taskId] = new Firebase(taskUrl);

          // listener
          fbref.tasks[taskId].once('value', function (snap) {
            onTaskChange(snap, categories[categoryId])

            // decrement pending requests
            pending.decr('task');
          });
        })
      }
    }

    onTaskChange = function (snap, category) {
      //console.log('onTaskChange', pending.requests)
      var
        notifications, newestNotificaionId, notificationUrl,
        taskId = snap.key(),
        tasks = category.tasks;

      // kill all fb refs bellow task
      // fbref.clear(['notifications']);
      // fbref.notifications = {};

      tasks[taskId] = snap.val();

      if ( snap.child('notifications').exists() ) {

        // get newest (= last) child
        notifications = snap.child('notifications').val();
        newestNotificaionId = Object.keys(notifications).slice(-1)[0];
        notificationUrl = fburl.notification(newestNotificaionId);

        // increment pending requests
        pending.incr('notification');

        // ref
        fbref.notifications[newestNotificaionId] = new Firebase(notificationUrl);

        // query
        fbref.notifications[newestNotificaionId].once('value', function (snap) {
          onNotificationChange(snap, tasks[taskId])
          
          // decrement pending requests
          pending.decr('notification');
        });

      }
    }

    onNotificationChange = function (snap, task) {
      //console.log('onNotificationChange', pending.requests)
      var
        timestamp = snap.child('timestamp').val(),
        now = new Date().getTime();

      // find out if notification is new enough to display
      // 60 days
      if (timestamp > now - 60*24*60*60*1000)
      {
        task.notification = snap.val();
      }
    }

    executeCallback = function () {
      // defer the callback since there will be multiple callbacks otherwise
      ! self.deferExe || $timeout.cancel(self.deferExe);

      self.deferExe = $timeout(function () {
        //console.log('exe', pending.requests)
        self.callback(company);
      });
    }


    checkPending = function () {
      //console.log(pending.requests)
      if (pending === 0) {
        executeCallback();
      }
    }


    this.watch = function (companyId, callback) {
      this.callback = callback;

      // fetch
      fbref.company = new Firebase(fburl.company(companyId));

      // increment pending requests
      pending.incr('company');

      // initiate process
      fbref.company.once('value', function (snap) {
        onCompanyChange(snap);

        // decrement pending requests
        pending.decr('company');
      });
    }

  }]);