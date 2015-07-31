require('controllers/categories/index.js');

(function (angular) {
  "use strict";

  angular
  .module('myApp.categories')
  .controller('CategoryCtrl', [
    '$scope',
    '$routeParams',
    '$location',
    'categoriesFactory',
    'deleteCategoryFactory',
    'confirmFactory',
    '$mdDialog',
    function($scope, $routeParams, $location, categoriesFactory, deleteCategoryFactory, confirmFactory, $mdDialog) {

      var 
        deleteCategory,
        categoryId = $routeParams.id;

      $scope.status = 'pristine';

      $scope.category = categoriesFactory.get(categoryId);

      $scope.submit = function (form) {
        if (form.$valid) {
          $scope.status = 'submitting';

          $scope.category
          .$save().then(function () {
            $scope.status = 'submitted';
            form.$setPristine();
          });

        } else {
          $scope.status = 'invalid';
        }
      }

      $scope.delete = function () {
        confirmFactory({
          message: 'Är du säker på att du vill radera denna kategori?',
          query: function () {
            return deleteCategoryFactory(categoryId);
          }
        }).then(function () {
          $location.path('settings/categories')
        });
      }

    }]);

})(angular);