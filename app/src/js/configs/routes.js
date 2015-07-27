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

  $routeProvider.whenAuthenticated('/settings/categories/id', {
    templateUrl: 'templates/categories/id.html'
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