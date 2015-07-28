(function (angular) {
  "use strict";

  angular
  .module('myApp.categories')
  .controller('NewTaskCtrl', [
    '$scope',
    'tasksFactory',
    '$mdDialog',
    function($scope, tasksFactory, $mdDialog) {

      $scope.subtmitting = false;
      $scope.invalid = false; 

      $scope.cancel = function () {
        $mdDialog.cancel();
      }

      $scope.submit = function (form) {
        if (form.$valid) {
          $scope.invalid = false;
          $scope.submitting = true;

          tasksFactory
          .all()
          .$add({
            name: $scope.task.name
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