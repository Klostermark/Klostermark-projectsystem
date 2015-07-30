(function (angular) {
  "use strict";

  var app = angular.module('myApp.companies', ['ngRoute', 'firebase.utils', 'firebase', 'ngMaterial', 'ngMessages']);

  app.controller('CompaniesCtrl', [
    '$scope',
    'companiesFactory',
    '$mdDialog',
    function($scope, companiesFactory, $mdDialog) {

      // loader active in the beginning
      $scope.fetchingData = true;

      // fetch tasks
      $scope.companies = companiesFactory.all();

      // data loaded, kill spinner
      $scope.companies.$loaded().then(function () {
        $scope.fetchingData = false;
      })

      $scope.add = function () {
        // call modal into existance
        $mdDialog.show({
          controller: 'NewCompanyCtrl',
          templateUrl: 'templates/dialogs/new-company.html',
          parent: angular.element(document.body)
        })
      }


    }]);

})(angular);