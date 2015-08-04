require('controllers/companies/index.js');

(function (angular) {
  "use strict";

  angular
  .module('myApp.companies')
  .controller('CompanyCtrl', [
    '$scope',
    '$routeParams',
    'joinForCompanyService',
    'activitiesFactory',
    '$mdDialog',
    '$mdToast',
    function($scope, $routeParams, joinForCompanyService, activitiesFactory, $mdDialog, $mdToast) {

      var
        date, setDefaultDate,
        self = this,
        companyId = $routeParams.id;
      
      $scope.company = {};
      $scope.activities = {};
      $scope.dateSelected = false;
      $scope.loadingActivities = true;

      setDefaultDate = function () {
        var
          now = new Date(),
          month = new Date(now.getFullYear() + '-' + (now.getMonth() + 1));

        $scope.month = month
        $scope.loadActivities(month);
      }
      
      joinForCompanyService.watch(companyId, function (company) {
        $scope.company = company;

        if ($scope.company.closingMonth) {
          date = new Date($scope.company.closingMonth);
          $scope.company.closingMonth = date.yyyymmdd();
        }

        if ($scope.company.firstClosing) {
          date = new Date($scope.company.firstClosing);
          $scope.company.firstClosing = date.yyyymmdd();
        }

        setDefaultDate();

        !! $scope.$$phase || $scope.$apply();
      });

      $scope.activityChange = function (taskId) {
        // remove falsy activity tasks
        $scope.activities[taskId] || delete $scope.activities[taskId];

        // sync
        $scope.activities.$save().then(function () {
          $mdToast.show({
            controller: 'toastCtrl',
            templateUrl: 'templates/toasts/activity-synced.html',
            hideDelay: 2000,
            position: 'top right fit'
          });
        });
      }

      $scope.loadActivities = function (date) {
        var time;
        if (date) {
          // user has selected a date
          time = new Date(date).getTime();

          $scope.activities = activitiesFactory.get([time, companyId]);

          // disable checkboxes intill loaded
          $scope.loadingActivities = true;

          $scope.activities.$loaded().then(function (ref) {
            // show data
            $scope.dateSelected = true;

            // make checkboxes available
            $scope.loadingActivities = false;
          })
        } else {
          // hide data
          $scope.dateSelected = false;
        }
      }

      $scope.showTask = function (task) {
        $mdDialog.show({
          templateUrl: 'templates/dialogs/show-task.html',
          parent: angular.element(document.body),
          locals: {
            task: task,
          },
          controller: 'ShowTaskCtrl'
        });
      }

    }]);

})(angular);