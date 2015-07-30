(function (angular) {
  "use strict";

  var app = angular.module('myApp.categories', ['ngRoute', 'firebase.utils', 'firebase', 'ngMaterial', 'ngMessages']);

  app.controller('CategoriesCtrl', [
    '$scope',
    'categoriesFactory',
    '$mdDialog',
    function($scope, categoriesFactory, $mdDialog) {

      $scope.ObjectKeys = Object.keys;

      // loader active in the beginning
      $scope.fetchingData = true;

      // fetch categories
      $scope.categories = categoriesFactory.all();

      // data loaded, kill spinner
      $scope.categories.$loaded().then(function () {
        $scope.fetchingData = false;
      })

      $scope.add = function () {
        // call modal into existance
        $mdDialog.show({
          controller: 'NewCategoryCtrl',
          templateUrl: 'templates/dialogs/new-category.html',
          parent: angular.element(document.body)
        })
      }


    }]);

})(angular);