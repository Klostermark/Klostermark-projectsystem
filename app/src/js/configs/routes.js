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