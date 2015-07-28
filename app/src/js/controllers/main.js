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