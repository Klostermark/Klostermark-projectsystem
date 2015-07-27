app.factory('messageList', ['fbutil', '$firebaseArray', function(fbutil, $firebaseArray) {
  var ref = fbutil.ref('messages').limitToLast(10);
  return $firebaseArray(ref);
}]);

app.factory('categoryList', ['fbutil', '$firebaseArray', function(fbutil, $firebaseArray) {
  var ref = fbutil.ref('categories').limitToLast(10);
  return $firebaseArray(ref);
}]);