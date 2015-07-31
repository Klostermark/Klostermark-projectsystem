(function (angular) {
  "use strict";
  
  angular.module('myApp')
  .controller('ConfirmCtrl', [
    '$scope',
    '$mdDialog',
    'message',
    'query',
    function($scope, $mdDialog, message, query) {

      $scope.message = message;
      $scope.status = 'pristine';

      $scope.confirm = function () {

        $scope.status = 'submitting';

        query().then(function (res) {
          // success
          // close dialog
          $mdDialog.hide();
        }, function (res) {
          // error
        }, function (res) {
          // notify
        });
      }

      $scope.cancel = function () {
        $mdDialog.cancel();
      }

    }]);

})(angular);