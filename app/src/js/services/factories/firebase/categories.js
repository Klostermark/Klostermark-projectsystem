angular
.module('myApp')
.factory('categoriesFactory', [
  'fbutil',
  '$firebaseArray',
  function(fbutil, $firebaseArray) {

    var ref = fbutil.ref('categories');
    return $firebaseArray(ref);

  }]);