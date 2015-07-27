app.factory('messageList', ['fbutil', '$firebaseArray', function(fbutil, $firebaseArray) {
  var ref = fbutil.ref('messages').limitToLast(10);
  return $firebaseArray(ref);
}]);