angular
.module('myApp')
.factory('AwaitFactory', [function() {

    return function (resolve) {

      var await = {
        resolved: false,
        val: 0,
        incr: function (where) {
          await.val++;
          // console.log('+', where, await.val)
        },
        decr: function (where) {
          await.val--;
          // console.log('-', where, await.val)

          if (await.val === 0) {
            await.resolved = true;
            await.resolve();
          }
        },
        tryResolve: function () {
          if ( ! await.resolved && await.val === 0) {
            await.resolved = true;
            await.resolve();
          }
        },
        resolve: function () {
          // console.log('await resolved')
          resolve();
        }
      };

      return await;

    }

  }]);