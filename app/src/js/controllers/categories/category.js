require('controllers/categories/index.js');


(function (angular) {
  "use strict";

  angular
  .module('myApp.categories')
  .controller('CategoryCtrl', [
    '$scope',
    '$routeParams',
    'categoriesFactory',
    '$firebaseUtils',
    function($scope, $routeParams, categoriesFactory, $firebaseUtils) {

      var id = $routeParams.id;

      $scope.submitting = false;
      $scope.submitted = false;
      $scope.invalid = false;

      $scope.status = 'pristine';

      $scope.category = categoriesFactory.get(id);

      console.log($scope.category);

      $scope.submit = function (form) {
        
        if (form.$valid) {
          $scope.invalid = false;
          $scope.submitting = true;
          $scope.status = 'submitting';

          $scope.category
          .$save().then(function () {
            $scope.submitting = false;
            $scope.submitted = true;
            $scope.status = 'submitted';
            form.$setPristine();
          });

        } else {
          $scope.invalid = true;
          $scope.status = 'invalid'
        }

      }


    }]);

})(angular);