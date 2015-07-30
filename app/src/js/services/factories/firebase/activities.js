angular
.module('myApp')
.factory('activitiesFactory', [
  'fbutil',
  '$firebaseArray',
  '$firebaseObject',
  'FBURL',
  function(fbutil, $firebaseArray, $firebaseObject, FBURL) {


    var
      url = FBURL + '/activities',
      ref = new Firebase(url),
      methods = {};

    methods.all = function () {
      return $firebaseArray(ref);
    }

    methods.get = function (ids) {
      var i, childRef, id;

      if (! Array.isArray(ids)) {
        ids = [ids];
      }

      childRef = ref;
      for (i in ids) {
        id = ids[i];
        childRef = childRef.child(id);
      }

      return $firebaseObject(childRef);
    }

    return methods;

  }]);