'use strict';

// Declare app level module which depends on filters, and services
var app = angular.module('myApp', [
    'ngMaterial',
    'myApp.config',
    'myApp.security',
    'myApp.home',
    'myApp.account',
    'myApp.login',
    'myApp.categories',
    'myApp.tasks',
    'firebase' // temp
  ])

  .run(['$rootScope', 'Auth', function($rootScope, Auth) {
    // track status of authentication
    Auth.$onAuth(function(user) {
      $rootScope.loggedIn = !!user;
    });
  }]);