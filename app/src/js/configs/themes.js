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