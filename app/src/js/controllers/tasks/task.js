(function (angular) {
  "use strict";

  angular
  .module('myApp.tasks')
  .controller('TaskCtrl', [
    '$scope',
    '$routeParams',
    '$location',
    'tasksFactory',
    'notificationsFactory',
    'categoriesFactory',
    'confirmFactory',
    'deleteTaskFactory',
    function($scope, $routeParams, $location, tasksFactory, notificationsFactory, categoriesFactory, confirmFactory, deleteTaskFactory) {

      var
        self = this,
        taskId = $routeParams.id;

      $scope.status = 'pristine';
      $scope.routine = {};
      $scope.category = {};

      // fetch data
      $scope.task = tasksFactory.get(taskId);
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
        // condition needed when deleting task
        if (category) {
          // add category to task
          $scope.task.category = category.$id;
          // update $scope.category
          $scope.category = category;
        }
      }

      $scope.submit = function (form) {
        var i, notificationId, category, saveElement;
        
        if (form.$valid && $scope.task.category && $scope.task.category.length) {
          $scope.status = 'submitting';

          // update categories
          for (i = 0; i < $scope.categories.length; i++) {
            category = $scope.categories[i];
            saveElement = false;
            
            if (category.$id === $scope.category.$id) {
              // add current task to chosen category
              if ( ! category.tasks) {
                category.tasks = {};
              }
              category.tasks[taskId] = true;

              saveElement = true;
            } else if (category.tasks && category.tasks[taskId]) {
              // remove current task from every other category
              delete category.tasks[taskId]
              saveElement = true;
            }

            if (saveElement) {
              $scope.categories.$save(i).catch(function (error) {
                alert('Något gick fel... :(');
                  console.log(error);
              });
            }
          }

          // save routine
          if ($scope.routine.changed) {
            // the routine has changed
            notificationId = notificationsFactory.push({
              taskId: taskId,
              description: $scope.routine.description,
              timestamp: Firebase.ServerValue.TIMESTAMP
            });

            // add notification id to task
            if ( ! $scope.task.notifications) {
              $scope.task.notifications = {};
            }
            $scope.task.notifications[notificationId] = true;
          }

          // update task
          $scope.task.$save().then(function () {
            $scope.status = 'submitted';
            form.$setPristine();
          });

        } else {
          $scope.status = 'invalid';
        }

      }

      $scope.delete = function () {
        confirmFactory({
          message: 'Är du säker på att du vill radera detta moment?',
          query: function () {
            return deleteTaskFactory(taskId);
          }
        }).then(function () {
          $location.path('settings/tasks')
        });
      }

    }]);

})(angular);