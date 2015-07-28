(function (angular) {
  "use strict";

  var app = angular.module('myApp.tasks', ['ngRoute', 'firebase.utils', 'firebase', 'ngMaterial', 'ngMessages']);

  app.controller('TasksCtrl', [
    '$scope',
    'tasksFactory',
    '$mdDialog',
    function($scope, tasksFactory, $mdDialog) {

      // loader active in the beginning
      $scope.fetchingData = true;

      // fetch tasks
      $scope.tasks = tasksFactory.all();

      // data loaded, kill spinner
      $scope.tasks.$loaded().then(function () {
        $scope.fetchingData = false;
      })

      $scope.add = function () {
        // call modal into existance
        $mdDialog.show({
          controller: 'NewTaskCtrl',
          templateUrl: 'templates/dialogs/new-task.html',
          parent: angular.element(document.body)
        })
      }


    }]);

})(angular);