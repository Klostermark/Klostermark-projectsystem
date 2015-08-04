(function (angular) {
  "use strict";
  
  angular.module('myApp')
  .controller('ShowTaskCtrl', [
    '$scope',
    '$mdDialog',
    'task',
    function($scope, $mdDialog, task) {

      $scope.task = task;

      $scope.hide = function () {
        $mdDialog.hide();
      }

    }]);

})(angular);