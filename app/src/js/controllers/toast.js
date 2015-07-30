(function (angular) {
  "use strict";

  angular.module('myApp')
  .controller('toastCtrl', [
    '$scope',
    '$mdToast',
    function($scope, $mdToast) {

      $scope.closeToast = function() {
        $mdToast.hide();
      };

    }]);

})(angular);