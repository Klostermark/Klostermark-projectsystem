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