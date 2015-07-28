(function (angular) {
  "use strict";

  angular
  .module('myApp.tasks')
  .controller('TaskCtrl', [
    '$scope',
    '$routeParams',
    'tasksFactory',
    function($scope, $routeParams, tasksFactory) {

      var id = $routeParams.id;

      $scope.status = 'pristine';

      $scope.task = tasksFactory.get(id);

      console.log($scope.task)

      $scope.submit = function (form) {
        
        if (form.$valid) {
          $scope.status = 'submitting';

          $scope.task
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