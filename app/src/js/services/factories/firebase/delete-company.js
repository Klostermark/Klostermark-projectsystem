angular
.module('myApp')
.factory('deleteCompanyFactory', [
  '$q',
  'AwaitFactory',
  'FBURL',
  function($q, AwaitFactory, FBURL) {

    var deleteCompany, deleteActivities, mainAwait, deffered;

    // so we will ba able to use .then
    deffered = $q.defer();

    // function which makes sure .then is fired when everything is done and not before
    mainAwait = new AwaitFactory(function () {
      deffered.resolve();
    });
 
    deleteCompany = function (companyId) {
      var categoryRef = new Firebase(FBURL + '/companies/' + companyId);

      categoryRef.remove(function (res) {
        mainAwait.decr('deleteCompany');
      });
    }

    deleteActivities = function (companyId) {
      var awaitActivities, activitiesRef, noReferences;

      activitiesRef = new Firebase(FBURL + '/activities');

      noReferences = true;

      awaitActivities = new AwaitFactory(function () {
        mainAwait.decr('removeTasksReference');
      });

      // fetch data
      activitiesRef.once('value', function (snap) {
        if (snap.numChildren()) {

          snap.forEach(function (snap) {
            if (snap.hasChild(companyId)) {
              noReferences = false;

              // inrease awaiting request
              awaitActivities.incr('company activity');

              // remove category from company activity
              snap.child(companyId).ref().remove(function () {

                // decrease awaiting requests
                awaitActivities.decr('company activity');

              });
            }
          });

          if (noReferences) {
            awaitActivities.tryResolve();
          }

        } else {
          // if no tasks exist we wanna resolve this one
          awaitActivities.tryResolve();
        }
      });
    }

    return function (companyId) {

      mainAwait.incr('deleteCompany');
      deleteCompany(companyId);

      mainAwait.incr('deleteActivities');
      deleteActivities(companyId);

      return deffered.promise;
    }



  }]);