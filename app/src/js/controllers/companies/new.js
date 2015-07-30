(function (angular) {
  "use strict";

  angular
  .module('myApp.companies')
  .controller('NewCompanyCtrl', [
    '$scope',
    'companiesFactory',
    '$mdDialog',
    function($scope, companiesFactory, $mdDialog) {

      $scope.subtmitting = false;
      $scope.invalid = false; 

      $scope.cancel = function () {
        $mdDialog.cancel();
      }

      $scope.submit = function (form) {
        if (form.$valid) {
          $scope.invalid = false;
          $scope.submitting = true;

          companiesFactory
          .all()
          .$add({
            name: $scope.company.name
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