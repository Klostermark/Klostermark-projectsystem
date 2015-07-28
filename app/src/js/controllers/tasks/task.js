(function (angular) {
  "use strict";

  angular
  .module('myApp.tasks')
  .controller('TaskCtrl', [
    '$scope',
    '$routeParams',
    'tasksFactory',
    'notificationsFactory',
    'categoriesFactory',
    function($scope, $routeParams, tasksFactory, notificationsFactory, categoriesFactory) {

      var
        self = this,
        id = $routeParams.id;

      $scope.status = 'pristine';
      $scope.routine = {};
      $scope.category = {};

      // fetch data
      $scope.task = tasksFactory.get(id);
      $scope.categories = categoriesFactory.all();

      // watch for fully loaded data
      $scope.task.$watch(function () {
        self.fetched();
      })
      $scope.categories.$watch(function () {
        self.fetched();
      })

      // wait so all data is fetched
      this.fetched = function () {
        this.fetchedProgress = this.fetchedProgress === undefined ? 0 : this.fetchedProgress + 1;

        if (this.fetchedProgress >= 2) {
          $scope.fetched = true;
          // issue#2
          $scope.category = this.getCategory();
        }
      }

      this.getCategory = function () {
        var i;

        for (i = 0; i < $scope.categories.length; i++) {
          if ($scope.categories[i].$id === $scope.task.category) {
            return $scope.categories[i];
          }
        }
      }

      $scope.filterCategories = function (match) {
        var
          i,
          categoriesArray = []

        // filter
        for (i = 0; i < $scope.categories.length; i++) {
          if ($scope.categories[i].name.toLowerCase().indexOf(match.toLowerCase()) > -1) {
            categoriesArray.push($scope.categories[i]);
          }
        }

        return categoriesArray;
      }

      $scope.selectedCategory = function (category) {
        // add to task
        $scope.task.category = category.$id;
      }

      $scope.submit = function (form) {
        var notificationId;
        
        if (form.$valid && $scope.task.category && $scope.task.category.length) {
          $scope.status = 'submitting';

          // the routine has changed
          if ($scope.routine.changed) {
            notificationId = notificationsFactory.push({
              taskId: id,
              description: $scope.routine.description,
              timestamp: Firebase.ServerValue.TIMESTAMP
            });

            // add notification id to task
            if ($scope.task.notifications) {
              $scope.task.notifications.push(notificationId);
            } else {
              $scope.task.notifications = [notificationId];
            }
          }

          // save task
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