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