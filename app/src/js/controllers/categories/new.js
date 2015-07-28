(function (angular) {
  "use strict";

  angular
  .module('myApp.categories')
  .controller('NewCategoryCtrl', [
    '$scope',
    'categoriesFactory',
    '$mdDialog',
    function($scope, categoriesFactory, $mdDialog) {

      $scope.subtmitting = false;
      $scope.invalid = false; 

      $scope.cancel = function () {
        $mdDialog.cancel();
      }

      $scope.submit = function (form) {
        if (form.$valid) {
          $scope.invalid = false;
          $scope.submitting = true;

          categoriesFactory
          .all()
          .$add({
            name: $scope.category.name
          })
          .then(function () {
            // data submitted succesfully
            $scope.submitting = false;
            $mdDialog.hide();
          });

        } else {
          // form not valid
          $scope.invalid = true;
        }

      }

    }]);

})(angular);