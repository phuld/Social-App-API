const functions = require('firebase-functions');
const app = require('express')();
const cors = require('cors');
app.use(cors());
const { 
    getAllScreams, 
    postOneScream, 
    getOneScream, 
    commentOnScream, 
    likeScream, 
    unlikeScream, 
    deleteScream,
    editScream, 
    getScreamByPage, 
    getNumberScreams, 
    getScreamsByUser, 
    getNumberScreamsbyUser, 
    blockScream, 
    getScreamsByFollowing
} = require('./handlers/screams');
const { signup, 
        login, 
        uploadImage, 
        addUserDetails, 
        getAuthenticatedUser, 
        getUserDetails, 
        markNotiRead, 
        followUser, 
        unfollowUser
    } = require('./handlers/users');
const auth = require('./utils/auth');
const { db } = require('./utils/admin');

//Scream Routes
app.get('/screams', getAllScreams);
app.post('/scream', auth, postOneScream);
app.get('/scream/:screamId', getOneScream);
app.post('/scream/:screamId/comment', auth, commentOnScream);
app.get('/scream/:screamId/like', auth, likeScream);
app.get('/scream/:screamId/unlike', auth, unlikeScream);
app.delete('/scream/:screamId', auth, deleteScream);
app.post('/scream/:screamId/edit', auth, editScream);
app.get('/screams/:type/page/:numberPage', getScreamByPage);
app.get('/number-screams', getNumberScreams);
app.get('/:userHandle/number-screams', getNumberScreamsbyUser);
app.get('/user/:userHandle/screams/:currentType/page/:currentPage', getScreamsByUser)
app.get('/scream/:screamId/block', auth, blockScream);
app.get('/screams/following', auth, getScreamsByFollowing);

//Users route
app.post('/signup', signup)
app.post('/login', login)
app.post('/user/image', auth, uploadImage);
app.post('/user', auth, addUserDetails);
app.get('/user', auth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', auth, markNotiRead);
app.get('/user/:userHandle/follow', auth, followUser);
app.get('/user/:userHandle/unfollow', auth, unfollowUser);

// domain.com/api/
exports.api = functions.https.onRequest(app);

exports.createNotiOnLike = functions.firestore.document('/likes/{id}')
    .onCreate((snapshot, context) => {
        return db.doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then(doc => {
                if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        screamId: doc.id,
                        createdAt: new Date().toISOString()
                    })
                }
            })
            .catch(error => {
                console.error(error)
            })
    })

exports.createNotiOnComment = functions.firestore.document('/comments/{id}')
    .onCreate((snapshot, context) => {
        return db.doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then(doc => {
                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    db.doc(`/notifications/${snapshot.id}`).set({
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'comment',
                        read: false,
                        screamId: doc.id,
                        createdAt: new Date().toISOString()
                    })
                }
            })
            .catch(error => {
                console.error(error);
            })
    })

exports.deleteNotiOnUnLike = functions.firestore.document('/likes/{id}')
    .onDelete(snapshot => {
        return db.doc(`/notifications/${snapshot.id}`).delete()
        .catch(error => {
            console.error(error);
            return
        })
    })

exports.onChangeImage = functions.firestore.document('/users/{userId}')
    .onUpdate((snapshot) => {
        console.log(snapshot.before.data().imageUrl);
        console.log(snapshot.after.data().imageUrl);
        if(snapshot.before.data().imageUrl !== snapshot.after.data().imageUrl) {
            console.log('Image has changed');
        }
        const batch = db.batch();
        return db.collection('screams')
            .where('userHandle', '==', snapshot.before.data().handle)
            .get()
            .then(data => {
                data.forEach(doc => {
                    const scream = db.doc(`/screams/${doc.id}`);
                    batch.update(scream, {userImage: snapshot.after.data().imageUrl})
                })
                return batch.commit();
            })
    })

exports.onDeleteScream = functions.firestore.document('/screams/{screamId}')
    .onDelete((snapshot, context) => {
        const screamId = context.params.screamId;
        const batch = db.batch();
        return db.collection('comments')
            .where('screamId', '==', screamId)
            .get()
            .then((data) => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/comments/${doc.id}`))
                })
                return db.collection('likes')
                    .where('screamId', '==', screamId)
                    .get()
            })
            .then((data) => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/likes/${doc.id}`))
                })
                return db.collection('notifications')
                    .where('screamId', '==', screamId)
                    .get()
            })
            .then((data) => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/notifications/${doc.id}`))
                })
                return batch.commit();
            })
            .catch(error => {
                console.error(error);
            })
    })


    
