
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
    'myApp.reports',
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
angular.module('myApp.config', ['ngMaterial'])

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
  .whenAuthenticated('/reports', {
    templateUrl: 'templates/reports.html',
    controller: 'ReportsCtrl'
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
    // templateUrl: 'templates/404.html'
    redirectTo: '/companies'
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



/* -------- app/src/js/configs/themes.js -------- */ 

'use strict';

angular.module('myApp.config')
.config([
  '$mdThemingProvider',
  function ($mdThemingProvider) {
    // Configure a dark theme with primary foreground yellow
    $mdThemingProvider.theme('docs-dark', 'default')
        .primaryPalette('blue')
        .dark();
  }]);


/* -------- app/src/js/controllers/account.js -------- */ 

(function (angular) {
  "use strict";

  var app = angular.module('myApp.account', ['firebase', 'firebase.utils', 'firebase.auth', 'ngRoute']);

  app.controller('AccountCtrl', [
    '$rootScope',
    '$scope',
    'Auth',
    'fbutil',
    'user',
    '$location',
    '$firebaseObject',
    function($rootScope, $scope, Auth, fbutil, user, $location, $firebaseObject) {
      var unbind, profile;

      // create a 3-way binding with the user profile object in Firebase
      // profile = $firebaseObject(fbutil.ref('users', user.uid));
      // profile
      // .$bindTo($rootScope, 'profile')
      // .then(function(ub) {
      //   console.log($rootScope.profile, profile)
      //   console.log(user.uid)
      //   unbind = ub;
      // });

      // expose logout function to scope
      // $rootScope.logout = function() {
      //   if( unbind ) { unbind(); }
      //   profile.$destroy();
      //   Auth.$unauth();
      //   $location.path('/login');
      // };

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
        });
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
    '$location',
    'categoriesFactory',
    'deleteCategoryFactory',
    'confirmFactory',
    '$mdDialog',
    function($scope, $routeParams, $location, categoriesFactory, deleteCategoryFactory, confirmFactory, $mdDialog) {

      var 
        deleteCategory,
        categoryId = $routeParams.id;

      $scope.status = 'pristine';

      $scope.category = categoriesFactory.get(categoryId);

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

      $scope.delete = function (event) {
        // keep the form pristine
        event.preventDefault();

        confirmFactory({
          message: 'Är du säker på att du vill radera denna kategori?',
          query: function () {
            return deleteCategoryFactory(categoryId);
          }
        }).then(function () {
          $location.path('settings/categories')
        });
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
        date, setDefaultDate,
        self = this,
        companyId = $routeParams.id;
      
      $scope.company = {};
      $scope.activities = {};
      $scope.dateSelected = false;
      $scope.loadingActivities = true;

      setDefaultDate = function () {
        var
          now = new Date(),
          month = new Date(now.getFullYear() + '-' + (now.getMonth() + 1));

        $scope.month = month
        $scope.loadActivities(month);
      }
      
      joinForCompanyService.watch(companyId, function (company) {
        $scope.company = company;

        if ($scope.company.closingMonth) {
          date = new Date($scope.company.closingMonth);
          $scope.company.closingMonth = date.yyyymmdd();
        }

        if ($scope.company.firstClosing) {
          date = new Date($scope.company.firstClosing);
          $scope.company.firstClosing = date.yyyymmdd();
        }

        setDefaultDate();

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
          time = new Date(date).getTime();

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

      $scope.showTask = function (task) {
        $mdDialog.show({
          templateUrl: 'templates/dialogs/show-task.html',
          parent: angular.element(document.body),
          locals: {
            task: task,
          },
          controller: 'ShowTaskCtrl'
        });
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
    '$location',
    'companiesFactory',
    'categoriesFactory',
    'confirmFactory',
    'deleteCompanyFactory',
    function($scope, $routeParams, $location, companiesFactory, categoriesFactory, confirmFactory, deleteCompanyFactory) {

      var
        self = this,
        companyId = $routeParams.id;

      $scope.status = 'pristine';
      $scope.companyCategories = [];
      $scope.banks = ['SEB', 'Handelsbanken', 'Nordea', 'Swedbank', 'Annan'];

      // fetch data
      $scope.company = companiesFactory.get(companyId);
      $scope.categories = categoriesFactory.all();

      
      // watch for fully loaded data
      $scope.company.$watch(function () {
        self.fetched('company');
      });
      $scope.categories.$watch(function () {
        self.fetched('categories');
      });
      $scope.company.$loaded().then(function () {
        self.fetched('company');
      });
      $scope.categories.$loaded().then(function () {
        self.fetched('categories');
      });

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

          // fix date issue
          ! $scope.company.brokenFiscalYear || self.setDate('closingMonth', $scope.company.closingMonth)
          ! $scope.company.brokenFiscalYear || self.setDate('firstClosing', $scope.company.firstClosing)
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

      $scope.setTimestamp = function (key, date) {
        // convert to timestamp
        $scope.company[key] = new Date(date).getTime();
      }

      this.setDate = function (key, timestamp) {
        $scope[key] = new Date(timestamp);
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

      $scope.delete = function (event) {
        // keep the form pristine
        event.preventDefault();

        confirmFactory({
          message: 'Är du säker på att du vill radera detta företag?',
          query: function () {
            return deleteCompanyFactory(companyId);
          }
        }).then(function () {
          $location.path('companies')
        });
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

(function (angular) {
  "use strict";
  var app = angular.module('myApp.login', ['firebase.utils', 'firebase.auth', 'ngRoute']);

  app.controller('LoginCtrl', [
    '$rootScope',
    '$scope',
    'Auth',
    '$location',
    'fbutil',
    function($rootScope, $scope, Auth, $location, fbutil) {
      $scope.email = null;
      $scope.pass = null;
      $scope.confirm = null;
      $scope.createMode = false;

      $scope.login = function(email, pass) {
        $scope.err = null;
        Auth.$authWithPassword({
          email: email,
          password: pass
        }, {
          rememberMe: true
        })
        .then(function(user) {
          $location.path('/');
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

})(angular);


/* -------- app/src/js/controllers/main.js -------- */ 

(function (angular) {
  "use strict";

  var app = angular.module('myApp.mainController', ['ngRoute']);

  app.controller('mainCtrl', [
    '$scope',
    '$location',
    'Auth',
    '$mdSidenav',
    function($scope, $location, Auth, $mdSidenav) {

      $scope.authorized = false;

      $scope.navigate = function (path) {
        // close sidenav
        $mdSidenav('left').close();
        $location.path(path);
      }

      $scope.openLeftMenu = function () {
        $mdSidenav('left').toggle();
      };

      $scope.logout = function () {
        Auth.$unauth();
        $location.path('/login');
      }

      Auth.$onAuth(function (authData) {
        if (authData) {
          $scope.authorized = true;
        } else {
          $scope.authorized = false;
        }
      });

    }]);

})(angular);


/* -------- app/src/js/controllers/misc/confirm.js -------- */ 

(function (angular) {
  "use strict";
  
  angular.module('myApp')
  .controller('ConfirmCtrl', [
    '$scope',
    '$mdDialog',
    'message',
    'query',
    function($scope, $mdDialog, message, query) {

      $scope.message = message;
      $scope.status = 'pristine';

      $scope.confirm = function () {

        $scope.status = 'submitting';

        query().then(function (res) {
          // success
          // close dialog
          $mdDialog.hide();
        }, function (res) {
          // error
        }, function (res) {
          // notify
        });
      }

      $scope.cancel = function () {
        $mdDialog.cancel();
      }

    }]);

})(angular);


/* -------- app/src/js/controllers/misc/show-task.js -------- */ 

(function (angular) {
  "use strict";
  
  angular.module('myApp')
  .controller('ShowTaskCtrl', [
    '$scope',
    '$mdDialog',
    'task',
    function($scope, $mdDialog, task) {

      $scope.task = task;

      $scope.hide = function () {
        $mdDialog.hide();
      }

    }]);

})(angular);


/* -------- app/src/js/controllers/misc/toast.js -------- */ 

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


/* -------- app/src/js/controllers/reports/index.js -------- */ 


(function (angular) {
  "use strict";

  var app = angular.module('myApp.reports', ['ngRoute', 'firebase.utils', 'firebase', 'ngMaterial', 'ngMessages']);

  app.controller('ReportsCtrl', [
    '$scope',
    'categoriesFactory',
    'companiesFactory',
    'activitiesFactory',
    function($scope, categoriesFactory, companiesFactory, activitiesFactory) {

      var 
        setDefaultDate, companies, tasks, activities, categoryId, compileReport, tryInitiate,
        self = this;

      $scope.filter = {
        month: null,
        category: null
      };
      $scope.storted = null;

      // fetch data
      $scope.categories = categoriesFactory.all();
      companies = companiesFactory.all();

      $scope.categories.$loaded().then(function () {
        tryInitiate('categories');
      });
      companies.$loaded().then(function () {
        tryInitiate('companies');
      });


      $scope.waitingFor = ['categories', 'companies'];
      tryInitiate = function (which) {
        $scope.waitingFor.splice($scope.waitingFor.indexOf(which), 1);

        if ($scope.waitingFor.length === 0) {
          setDefaultDate();
        }
      }


      setDefaultDate = function () {
        var
          now = new Date(),
          month = new Date(now.getFullYear() + '-' + (now.getMonth() + 1));

        $scope.filter.month = month;
      }

      $scope.tryCompileReport = function () {
        var timestamp;

        if ($scope.filter.month && $scope.filter.month.getFullYear() > 2000 && $scope.filter.category) {
          timestamp = $scope.filter.month.getTime();
          categoryId = $scope.filter.category.$id;
          tasks = $scope.filter.category.tasks;

          activities = activitiesFactory.get(timestamp);

          activities
          .$loaded()
          .then(function (res) {
            // add listener
            activities.$watch(function () {
              compileReport();
            });

            compileReport();
          });

        }
      }

      compileReport = function () {
        var
          i, companyId, task, incomplete,
          sorted = {
            complete: [],
            incomplete: []
          };

        for (i = 0; i < companies.length; i++) {

          if (companies[i].categories && companies[i].categories[categoryId]) {
            companyId = companies[i].$id;

            // sort out companies subscribed to category
            if (activities[companyId]) {
              incomplete = false;

              for (task in tasks) {
                if ( ! activities[companyId][task]) {
                  // task is missing in activities
                  incomplete = true;
                  sorted.incomplete.push(companies[i]);
                  break;
                }
              }

              incomplete || sorted.complete.push(companies[i]);

            } else {
              // the company have no activities this month
              sorted.incomplete.push(companies[i]);
            }
          }
        }
        $scope.sorted = sorted;
      }

    }]);

})(angular);


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
    '$location',
    'tasksFactory',
    'notificationsFactory',
    'categoriesFactory',
    'confirmFactory',
    'deleteTaskFactory',
    function($scope, $routeParams, $location, tasksFactory, notificationsFactory, categoriesFactory, confirmFactory, deleteTaskFactory) {

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
      $scope.categories.$loaded().then(function () {
        self.fetched();
      });
      $scope.task.$loaded().then(function () {
        self.fetched();
      });

      // display correct category
      $scope.categories.$watch(function () {
        // issue#2
        $scope.category = self.getCategory();
      });


      // wait so all data is fetched
      this.fetched = function () {
        this.fetchedProgress = this.fetchedProgress === undefined ? 1 : this.fetchedProgress + 1;

        if (this.fetchedProgress >= 2) {
          $scope.fetched = true;
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
        // condition needed when deleting task
        if (category) {
          // add category to task
          $scope.task.category = category.$id;
          // update $scope.category
          $scope.category = category;
        }
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

      $scope.delete = function (event) {
        // keep the form pristine
        event.preventDefault();

        confirmFactory({
          message: 'Är du säker på att du vill radera detta moment?',
          query: function () {
            return deleteTaskFactory(taskId);
          }
        }).then(function () {
          $location.path('settings/tasks')
        });
      }

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


/* -------- app/src/js/misc/yyyymmdd.js -------- */ 

Date.prototype.yyyymmdd = function() {
  var yyyy = this.getFullYear().toString();
  var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
  var dd  = this.getDate().toString();
  return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]); // padding
};


/* -------- app/src/js/services/factories/await.js -------- */ 

angular
.module('myApp')
.factory('AwaitFactory', [function() {

    return function (resolve) {

      var await = {
        resolved: false,
        val: 0,
        incr: function (where) {
          await.val++;
          // console.log('+', where, await.val)
        },
        decr: function (where) {
          await.val--;
          // console.log('-', where, await.val)

          if (await.val === 0) {
            await.resolved = true;
            await.resolve();
          }
        },
        tryResolve: function () {
          if ( ! await.resolved && await.val === 0) {
            await.resolved = true;
            await.resolve();
          }
        },
        resolve: function () {
          // console.log('await resolved')
          resolve();
        }
      };

      return await;

    }

  }]);


/* -------- app/src/js/services/factories/confirm.js -------- */ 

angular
.module('myApp')
.factory('confirmFactory', [
  '$mdDialog',
  function($mdDialog) {

    return function (data) {

      return $mdDialog.show({
        templateUrl: 'templates/dialogs/confirm.html',
        parent: angular.element(document.body),
        locals: {
          message: data.message,
          query: data.query,
        },
        controller: 'ConfirmCtrl'
      });

    }

  }]);


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


/* -------- app/src/js/services/factories/firebase/delete-category.js -------- */ 

angular
.module('myApp')
.factory('deleteCategoryFactory', [
  '$q',
  'AwaitFactory',
  'FBURL',
  function($q, AwaitFactory, FBURL) {

    var deleteCategory, removeTasksReference, removeCompanyReference, mainAwait, deffered;

    // so we will ba able to use .then
    deffered = $q.defer();

    // function which makes sure .then is fired when everything is done and not before
    mainAwait = new AwaitFactory(function () {
      deffered.resolve();
    });
 
    deleteCategory = function (categoryId) {
      var categoryRef = new Firebase(FBURL + '/categories/' + categoryId);

      categoryRef.remove(function (res) {
        mainAwait.decr('deleteCategory');
      });
    }

    removeTasksReference = function (categoryId) {
      var awaitTasks, tasksRef;

      tasksRef = new Firebase(FBURL + '/tasks');

      awaitTasks = new AwaitFactory(function () {
        mainAwait.decr('removeTasksReference');
      });

      // filter
      tasksRef = tasksRef
      .orderByChild('category')
      .startAt(categoryId)
      .endAt(categoryId);

      // fetch data
      tasksRef.once('value', function (snap) {
        if (snap.numChildren()) {

          snap.forEach(function (snap) {

            // inrease awaiting request
            awaitTasks.incr('task');

            // remove category from task
            snap.child('category').ref().remove(function () {

              // decrease awaiting requests
              awaitTasks.decr('task');

            });
          });

        } else {
          // if no tasks exist we wanna resolve this one
          awaitTasks.tryResolve();
        }
      });
    }

    removeCompanyReference = function (categoryId) {
      var awaitCompanies, companiesRef, noReferences;

      companiesRef = new Firebase(FBURL + '/companies');

      awaitCompanies = new AwaitFactory(function () {
        mainAwait.decr('removeCompanyReference')
      });

      // if there is to the task from the companies
      noReferences = true;

      // filter
      companiesRef = companiesRef
      .orderByChild('categories')

      companiesRef.once('value', function (snap) {
        if (snap.hasChildren()) {

          snap.forEach(function (snap) {
            if (snap.hasChild('categories/' + categoryId)) {
              noReferences = false;

              // incr
              awaitCompanies.incr('company');

              // remove category from company
              snap.child('categories/' + categoryId).ref().remove(function () {

                // decr
                awaitCompanies.decr('company');

              });
            }

          });

          // will not touch the any incr() or decr() of awaitingCompanies
          // this condition will be checked after the loop obviously
          if (noReferences) {
            awaitCompanies.tryResolve();
          }

        } else {
          awaitCompanies.tryResolve();
        }
      });
    }


    return function (categoryId) {

      mainAwait.incr('deleteCategory');
      deleteCategory(categoryId);

      mainAwait.incr('removeTasksReference');
      removeTasksReference(categoryId);

      mainAwait.incr('removeCompanyReference');
      removeCompanyReference(categoryId);

      return deffered.promise;
    }



  }]);


/* -------- app/src/js/services/factories/firebase/delete-company.js -------- */ 

angular
.module('myApp')
.factory('deleteCompanyFactory', [
  '$q',
  'AwaitFactory',
  'FBURL',
  function($q, AwaitFactory, FBURL) {

    var deleteCompany, deleteActivities, mainAwait, deffered;

    // so we will ba able to use .then
    deffered = $q.defer();

    // function which makes sure .then is fired when everything is done and not before
    mainAwait = new AwaitFactory(function () {
      deffered.resolve();
    });
 
    deleteCompany = function (companyId) {
      var categoryRef = new Firebase(FBURL + '/companies/' + companyId);

      categoryRef.remove(function (res) {
        mainAwait.decr('deleteCompany');
      });
    }

    deleteActivities = function (companyId) {
      var awaitActivities, activitiesRef, noReferences;

      activitiesRef = new Firebase(FBURL + '/activities');

      noReferences = true;

      awaitActivities = new AwaitFactory(function () {
        mainAwait.decr('removeTasksReference');
      });

      // fetch data
      activitiesRef.once('value', function (snap) {
        if (snap.numChildren()) {

          snap.forEach(function (snap) {
            if (snap.hasChild(companyId)) {
              noReferences = false;

              // inrease awaiting request
              awaitActivities.incr('company activity');

              // remove category from company activity
              snap.child(companyId).ref().remove(function () {

                // decrease awaiting requests
                awaitActivities.decr('company activity');

              });
            }
          });

          if (noReferences) {
            awaitActivities.tryResolve();
          }

        } else {
          // if no tasks exist we wanna resolve this one
          awaitActivities.tryResolve();
        }
      });
    }

    return function (companyId) {

      mainAwait.incr('deleteCompany');
      deleteCompany(companyId);

      mainAwait.incr('deleteActivities');
      deleteActivities(companyId);

      return deffered.promise;
    }



  }]);


/* -------- app/src/js/services/factories/firebase/delete-task.js -------- */ 

angular
.module('myApp')
.factory('deleteTaskFactory', [
  '$q',
  'AwaitFactory',
  'FBURL',
  function($q, AwaitFactory, FBURL) {

    var deleteTask, deleteNotifications, removeActivitiesReference, removeCategoryReference, mainAwait, deffered;

    // so we will ba able to use .then
    deffered = $q.defer();

    // function which makes sure .then is fired when everything is done and not before
    mainAwait = new AwaitFactory(function () {
      deffered.resolve();
    });
 
    deleteTask = function (taskId) {
      var taskRef = new Firebase(FBURL + '/tasks/' + taskId);

      taskRef.remove(function () {
        mainAwait.decr('deleteTask');
      });
    }

    deleteNotifications = function (taskId) {
      var awaitNotifications, notificationsRef;

      notificationsRef = new Firebase(FBURL + '/notifications');

      awaitNotifications = new AwaitFactory(function () {
        mainAwait.decr('deleteNotifications');
      });

      // filter
      notificationsRef = notificationsRef
      .orderByChild('taskId')
      .equalTo(taskId);

      // fetch data
      notificationsRef.once('value', function (snap) {
        if (snap.numChildren()) {

          snap.forEach(function (snap) {

            // inrease awaiting request
            awaitNotifications.incr('notification');

            // remove notification
            snap.ref().remove(function () {

              // decrease awaiting requests
              awaitNotifications.decr('notification');

            });
          });

        } else {
          // if no notifications exist we wanna resolve this one
          awaitNotifications.tryResolve();
        }
      })
    }

    removeCategoryReference = function (taskId) {
      var awaitCategories, categoriesRef, noReferences;

      categoriesRef = new Firebase(FBURL + '/categories');

      awaitCategories = new AwaitFactory(function () {
        mainAwait.decr('removeCategoryReference')
      });

      // if there is no reference to the task from the categories
      noReferences = true;

      categoriesRef.once('value', function (snap) {
        if (snap.hasChildren()) {

          snap.forEach(function (snap) {
            if (snap.hasChild('tasks/' + taskId)) {
              noReferences = false;

              // incr
              awaitCategories.incr('category');

              // remove task reference from category
              snap.child('tasks/' + taskId).ref().remove(function () {

                // decr
                awaitCategories.decr('category');

              });
            }

          });

          // will not touch any incr() or decr() of awaitcategories
          // this condition will be checked after the loop obviously
          if (noReferences) {
            awaitCategories.tryResolve();
          }

        } else {
          awaitCategories.tryResolve();
        }
      });
    }

    removeActivitiesReference = function (taskId) {
      var awaitActivities, activitiesRef, noReferences;

      activitiesRef = new Firebase(FBURL + '/activities');

      awaitActivities = new AwaitFactory(function () {
        mainAwait.decr('removeActivitiesReference')
      });

      // if there is no reference to the task from the categories
      noReferences = true;

      activitiesRef.once('value', function (months) {

        // months
        if (months.hasChildren()) {

          months.forEach(function (month) {

            // a month will not exist without company activities inside
            month.forEach(function (company) {

              if (company.hasChild(taskId)) {
                noReferences = false;

                // incr
                awaitActivities.incr('activities');

                // remove task reference from activities
                company.child(taskId).ref().remove(function () {

                  // decr
                  awaitActivities.decr('activities');

                });
              }
            });
          });

          // will not touch any incr() or decr() of awaitActivities
          // this condition will be checked after the loop obviously
          if (noReferences) {
            awaitActivities.tryResolve();
          }

        } else {
          awaitActivities.tryResolve();
        }
      });
    }


    return function (taskId) {

      mainAwait.incr('deleteTask');
      deleteTask(taskId);

      mainAwait.incr('deleteNotifications');
      deleteNotifications(taskId);

      mainAwait.incr('removeCategoryReference');
      removeCategoryReference(taskId);

      mainAwait.incr('removeActivitiesReference');
      removeActivitiesReference(taskId);


      return deffered.promise;
    }



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