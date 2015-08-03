(function (angular) {
  "use strict";

  var app = angular.module('myApp.mainController', ['ngRoute']);

  app.controller('mainCtrl', [
    '$scope',
    '$rootScope',
    '$location',
    '$mdSidenav',
    function($scope, $rootScope, $location, $mdSidenav) {

      $rootScope.navigate = function (path) {
        // close sidenav
        $mdSidenav('left').close();
        $location.path(path);
      }

      $scope.openLeftMenu = function() {
        $mdSidenav('left').toggle();
      };

    }]);

})(angular);