(function (angular) {
  "use strict";

  var app = angular.module('myApp.categories', ['ngRoute', 'firebase.utils', 'firebase', 'ngMaterial', 'ngMessages']);

  app.controller('CategoriesCtrl', [
    '$scope',
    'categoriesFactory',
    '$mdDialog',
    function($scope, categoriesFactory, $mdDialog) {

      $scope.categories = categoriesFactory.all();

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