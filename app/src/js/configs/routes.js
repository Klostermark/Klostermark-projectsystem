app.config(['$routeProvider', function($routeProvider) {

  $routeProvider
  .whenAuthenticated('/chat', {
    templateUrl: 'templates/chat.html',
    controller: 'ChatCtrl'
  })
  .whenAuthenticated('/account', {
    templateUrl: 'templates/account.html',
    controller: 'AccountCtrl'
  })
  .whenAuthenticated('/settings', {
    templateUrl: 'templates/settings.html',
  })
  .whenAuthenticated('/settings/categories', {
    templateUrl: 'templates/categories/index.html'
  })
  .whenAuthenticated('/settings/categories/:id', {
    templateUrl: 'templates/categories/category.html'
  })
  .whenAuthenticated('/settings/tasks', {
    templateUrl: 'templates/tasks/index.html',
  })
  .whenAuthenticated('/settings/tasks/:id', {
    templateUrl: 'templates/tasks/task.html',
  })
  .whenAuthenticated('/companies', {
    templateUrl: 'templates/companies/list.html',
  })
  .whenAuthenticated('/companies/company', {
    templateUrl: 'templates/companies/single.html',
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