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