angular
.module('myApp')
.factory('categoriesFactory', [
  'fbutil',
  '$firebaseArray',
  '$firebaseObject',
  'FBURL',
  function(fbutil, $firebaseArray, $firebaseObject, FBURL) {


    var
      url = FBURL + '/categories',
      ref = new Firebase(url),
      methods = {};

    methods.all = function () {
      return $firebaseArray(ref);
    }

    methods.get = function (id) {
      return $firebaseObject(ref.child(id));
    }

    methods.push = function (data) {
      ref.push(data);
    }

    return methods;

  }]);