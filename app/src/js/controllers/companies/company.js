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
        self = this,
        companyId = $routeParams.id;
      
      $scope.company = {};
      $scope.activities = {};
      $scope.dateSelected = false;
      $scope.loadingActivities = true;

      
      joinForCompanyService.watch(companyId, function (company) {
        $scope.company = company;
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
          time = new Date(date).getTime()

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

      $scope.showDescription = function (task) {
        $mdDialog.show(
          $mdDialog.alert()
            .title('Momentbeskrivning')
            .content(task.description)
            .ariaLabel('Momentbeskrivning')
            .ok('Förstått')
        );
      }

      $scope.showNotification = function (task) {
        $mdDialog.show(
          $mdDialog.alert()
            .title('Rutinförändring')
            .content(task.notification.description)
            .ariaLabel('Rutinförändring')
            .ok('Förstått')
        );
      }   

    }]);

})(angular);