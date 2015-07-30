require('controllers/categories/index.js');

(function (angular) {
  "use strict";

  angular
  .module('myApp.categories')
  .controller('CategoryCtrl', [
    '$scope',
    '$routeParams',
    'categoriesFactory',
    function($scope, $routeParams, categoriesFactory) {

      var id = $routeParams.id;

      $scope.status = 'pristine';

      $scope.category = categoriesFactory.get(id);

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

    }]);

})(angular);