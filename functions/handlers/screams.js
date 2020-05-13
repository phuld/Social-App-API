const  {db} = require('../utils/admin');

exports.getAllScreams = (request, response) => {
    db
        .collection('screams')
        .orderBy('createdAt', 'desc')
        .get()
        .then(data => {
            let screams = [];
            data.forEach(doc => {
                screams.push({
                    screamId: doc.id,
                    userHandle: doc.data().userHandle,
                    body: doc.data().body,
                    createdAt: doc.data().createdAt, 
                    likeCount: doc.data().likeCount, 
                    commentCount: doc.data().commentCount, 
                    userImage: doc.data().userImage
                })
            })
            return response.json(screams)
        })
        .catch(error => {
            console.error(error)
        })
}

exports.postOneScream = (request, response) => {
    if(request.body.body.trim() === '') {
        return response.status(400).json({
            body: "Body must not be empty"
        })
    }
    const newScream = {
        body: request.body.body,
        userHandle: request.user.handle,
        userImage: request.user.imageUrl,
        likeCount: 0, 
        commentCount: 0,
        createdAt: new Date().toISOString()
    }
    db.collection('screams')
        .add(newScream)
        .then((data) => {
            const resScream = newScream;
            resScream.screamId = data.id;
            response.json(resScream)
        })
        .catch((error) => {
            response.status(500).json({
                body: error
            })
            console.error(error)
        })
}

exports.getOneScream = (request, response) => {
    let screamData = {};
    db.doc(`/screams/${request.params.screamId}`)
        .get()
        .then((doc) => {
            if(!doc.exists) {
                return response.status(404).json({
                    error: 'Scream not found'
                })
            }
            screamData = doc.data();
            screamData.screamId = doc.id;
            return db.collection('comments')
                .where('screamId', '==', request.params.screamId)
                .orderBy('createdAt', 'desc')
                .get()
        })
        .then((data) => {
            screamData.comments = [];
            data.forEach(doc => {
                screamData.comments.push(doc.data())
            })
            return response.json(screamData)
        })
        .catch(error => {
            console.error(error)
            return response.status(500).json(error)
        })
}

exports.commentOnScream = (request, response) => {
    if(request.body.body.trim() === '') {
        return response.status(400).json({
            body: "Must not be empty"
        })
    }
    const newComment = {
        body: request.body.body, 
        screamId: request.params.screamId, 
        userHandle: request.user.handle, 
        createdAt: new Date().toISOString(), 
        userImage: request.user.imageUrl
    }

    db.doc(`/screams/${request.params.screamId}`)
        .get()
        .then((doc) => {
            if(!doc.exists){
                return response.status(404).json({
                    error: 'Scream not found'
                })
            }
            return db.doc(`/screams/${request.params.screamId}`).update({commentCount: doc.data().commentCount + 1})
        })
        .then(() => {
            return db.collection('comments')
                .add(newComment)
        })
        .then(() => {
            return response.json(newComment)
        })
        .catch(error => {
            console.error(error);
            return response.status(500).json(error)
        })
}

exports.likeScream = (request, response) => {
    let screamData = {};
    db.doc(`/screams/${request.params.screamId}`)
        .get()
        .then((doc) => {
            if(!doc.exists) {
                return response.status(404).json({
                    error: 'Scream not found'
                })
            }
           
            screamData = doc.data();
            screamData.screamId = doc.id;
            return db.collection('likes')
                .where('userHandle', '==', request.user.handle)
                .where('screamId', '==', request.params.screamId)
                .limit(1)
                .get()
        })
        .then((data) => {
            if(!data.empty) {
                return response.json({
                    message: 'Scream already liked'
                })
            }else {
                return db.collection('likes')
                    .add({
                        screamId: request.params.screamId, 
                        userHandle: request.user.handle
                    })
            }
        })
        .then(() => {
            screamData.likeCount++;
            return db.doc(`/screams/${request.params.screamId}`).update({likeCount: screamData.likeCount})
        })
        .then(() => {
            return response.json(screamData)
        })
        .catch((error) => {
            console.error(error)
            return response.status.json(error)
        })
}

exports.unlikeScream = (request, response) => {
    let screamData = {};
    db.doc(`/screams/${request.params.screamId}`)
        .get()
        .then(doc => {
            if(!doc.exists) {
                return response.status(404).json({
                    error: 'Scream not found'
                })
            }
            screamData = doc.data();
            screamData.screamId = doc.id;
            return db.collection('likes')
                .where('userHandle', '==', request.user.handle)
                .where('screamId', '==', request.params.screamId)
                .limit(1)
                .get()
        })
        .then(data => {
            if(data.empty) {
                return response.json({
                    message: 'Scream not like'
                })
            }else {
                return db.doc(`/likes/${data.docs[0].id}`).delete()
            }
        })
        .then(() => {
            screamData.likeCount--;
            db.doc(`/screams/${request.params.screamId}`).update({likeCount: screamData.likeCount})
        })
        .then(() => {
            return response.json(screamData)
        })
        .catch((error) => {
            console.error(error)
            return response.status(500).json(error);
        })
}

exports.deleteScream = (request, response) => {
    db.doc(`/screams/${request.params.screamId}`)
        .get()
        .then(doc => {
            if(!doc.exists) {
                return response.status(404).json({
                    error: 'Scream not found'
                })
            }
            if(doc.data().userHandle !== request.user.handle) {
                return response.status(403).json({
                    error: 'Unauthorized'
                })
            }
            return db.doc(`/screams/${request.params.screamId}`).delete()
        })
        .then(() => {
            return response.json({
                message: 'Scream deleted successfully'
            })
        })
        .catch(error => {
            console.error(error)
            return response.status(500).json(error)
        })
}