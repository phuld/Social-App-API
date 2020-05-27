const { db } = require('../utils/admin');

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
    if (request.body.body.trim() === '') {
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
            if (!doc.exists) {
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
    if (request.body.body.trim() === '') {
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

    let screamData = {};

    db.doc(`/screams/${request.params.screamId}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                return response.status(404).json({
                    error: 'Scream not found'
                })
            }
            screamData = doc.data();
            screamData.screamId = doc.id;
            screamData.commentCount++;
            return db.doc(`/screams/${request.params.screamId}`).update({ commentCount: doc.data().commentCount + 1 })
        })
        .then(() => {
            return db.collection('comments')
                .add(newComment)
        })
        .then(() => {
            // return response.json(newComment)
            screamData.comments = [];
            return db.collection('comments')
                .where('screamId', "==", request.params.screamId)
                .orderBy('createdAt', 'desc')
                .get()
        })
        .then(doc => {
            doc.forEach(data => {
                screamData.comments.push(data.data())
            })
            return response.json(screamData)
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
            if (!doc.exists) {
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
            if (!data.empty) {
                return response.json({
                    message: 'Scream already liked'
                })
            } else {
                return db.collection('likes')
                    .add({
                        screamId: request.params.screamId,
                        userHandle: request.user.handle
                    })
            }
        })
        .then(() => {
            screamData.likeCount++;
            return db.doc(`/screams/${request.params.screamId}`).update({ likeCount: screamData.likeCount })
        })
        .then(() => {
            screamData.comments = [];
            return db.collection('comments')
                .where('screamId', '==', request.params.screamId)
                .orderBy('createdAt', 'desc')
                .get()
        })
        .then((doc) => {
            doc.forEach(data => {
                screamData.comments.push({
                    body: data.data().body,
                    createdAt: data.data().createdAt,
                    screamId: data.data().screamId,
                    userHandle: data.data().userHandle,
                    userImage: data.data().userImage
                })
            })
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
            if (!doc.exists) {
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
            if (data.empty) {
                return response.json({
                    message: 'Scream not like'
                })
            } else {
                return db.doc(`/likes/${data.docs[0].id}`).delete()
            }
        })
        .then(() => {
            screamData.likeCount--;
            db.doc(`/screams/${request.params.screamId}`).update({ likeCount: screamData.likeCount })
        })
        .then(() => {
            screamData.comments = [];
            return db.collection('comments')
                .where('screamId', '==', request.params.screamId)
                .orderBy('createdAt', 'desc')
                .get()
        })
        .then((doc) => {
            doc.forEach(data => {
                screamData.comments.push({
                    body: data.data().body,
                    createdAt: data.data().createdAt,
                    screamId: data.data().screamId,
                    userHandle: data.data().userHandle,
                    userImage: data.data().userImage
                })
            })
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
            if (!doc.exists) {
                return response.status(404).json({
                    error: 'Scream not found'
                })
            }
            if (doc.data().userHandle !== request.user.handle) {
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

exports.editScream = (request, response) => {
    if (request.body.body.trim() === '') {
        return response.status(400).json({
            body: 'Body must not empty'
        })
    }
    let screamData = {};
    db.doc(`/screams/${request.params.screamId}`)
        .get()
        .then(doc => {
            if (!doc.exists) {
                return response.status(404).json({
                    user: 'Scream not found'
                })
            }
            if (request.user.handle !== doc.data().userHandle) {
                return response.status(403).json({
                    user: 'Unauthorized'
                })
            }
            screamData = doc.data();
            screamData.screamId = doc.id;
            screamData.body = request.body.body.trim()
            return db.doc(`/screams/${request.params.screamId}`)
                .update({
                    body: request.body.body.trim()
                })
        })
        .then(() => {
            return response.status(200).json(screamData)
        })
        .catch(error => {
            console.error(error);
            return response.status(500).json(error);
        })
}

exports.getScreamByPage = (request, response) => {
    let numberPage = 1;
    let screams = [];
    let type = '';
    const types = ['newest', 'most-comments', 'most-likes'];
    console.log(types.indexOf(request.params.type));
    if (types.indexOf(request.params.type) == -1) {
        return response.status(400).json({
            body: 'URL not found, please check again.'
        })
    }
    if (request.params.type === "newest") {
        type = "createdAt";
    } else if (request.params.type === "most-comments") {
        type = "commentCount";
    } else type = "likeCount";

    if (request.params.numberPage) {
        numberPage = request.params.numberPage
    }
    db.collection('screams')
        .orderBy(type, 'desc')
        .limit(numberPage * 10)
        .get()
        .then(doc => {
            const firstScream = doc.docs[doc.docs.length - 10];
            // const startAt = type ==="createdAt" ? firstScream.createdAt : type === "commentCount" ? firstScream.commentCount : firstScream.likeCount;
            // console.log(startAt);
            return db.collection('screams')
                .orderBy(type, 'desc')
                .startAt(firstScream)
                .limit(10)
                .get()
        })
        .then(doc => {
            doc.forEach(data => {
                screams.push({
                    screamId: data.id,
                    userHandle: data.data().userHandle,
                    body: data.data().body,
                    createdAt: data.data().createdAt,
                    likeCount: data.data().likeCount,
                    commentCount: data.data().commentCount,
                    userImage: data.data().userImage
                })
            })
            return response.json(screams)
        })
        .catch(error => {
            console.error(error);
            return response.status(500).json(error);
        })
}

exports.getNumberScreams = (request, response) => {
    db.collection('screams')
        .get()
        .then(doc => {
            return response.json({
                number: doc.docs.length
            })
        })
        .catch(error => {
            console.error(error);
            return response.status(500).json(error)
        })
}
exports.getScreamsByUser = (request, response) => {
    const userHandle = request.params.userHandle;
    const currentType = request.params.currentType;
    let type='';
    if(currentType === "newest") {
        type = "createdAt"
    }else if(currentType === "most-comments") {
        type = "commentCount"
    }else {
        type = "likeCount"
    }
    const currentPage = request.params.currentPage;
    let screams = [];
    db.doc(`/users/${userHandle}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                return response.status(404).json({
                    handle: 'User not found'
                })
            }
            return db.collection('screams')
                .where('userHandle', "==", userHandle)
                .orderBy(type, "desc")
                .limit(currentPage * 10)
                .get()
        })
        .then(data => {
            if(data.docs.length === 0) return response.json(screams);
            const first = data.docs[(data.docs.length - 10) > 0 ? data.docs.length - 10 : 0];
            return db.collection('screams')
                .where('userHandle', '==', userHandle)
                .orderBy(type, 'desc')
                .startAt(first)
                .limit(10)
                .get()
        })
        .then(doc => {
            doc.forEach(data => {
                screams.push({
                    screamId: data.id,
                    userHandle: data.data().userHandle,
                    body: data.data().body,
                    createdAt: data.data().createdAt,
                    likeCount: data.data().likeCount,
                    commentCount: data.data().commentCount,
                    userImage: data.data().userImage
                })
            })
            return response.json(screams)
        })
        .catch(error => {
            console.error(error)
            return response.status(500).json(error)
        })
}

exports.getNumberScreamsbyUser = (request, response) => {
    db.collection('screams')
        .where('userHandle', '==', request.params.userHandle)
        .get()
        .then(doc => {
            return response.json({
                number: doc.docs.length
            })
        })
        .catch(error => {
            console.error(error);
            return response.status(500).json(error);
        })
}

exports.blockScream = (request, response) => {
    const blockData = {
        screamId: request.params.screamId, 
        userHandle: request.user.handle
    }

    db.collection('blocks')
        .where('screamId', '==', request.params.screamId)
        .where('userHandle', '==', request.user.handle)
        .get()
        .then(doc => {
            if(doc.docs.length > 0) {
                return response.status(400).json({
                    block: 'You blocked this scream before, please check again.'
                })
            }
            return db.collection('blocks')
                .add(blockData)
        })
        .then((data) => {
            const block = blockData;
            block.blockId = data.id;
            return response.status(200).json(block)
        })
        .catch(error => {
            console.error(error);
            return response.status(500).json(error);
        })
}

exports.getScreamsByFollowing = (request, response) => {
    const userHandle = request.params.userHandle;
    const following = []
    db.collection('follows')
        .where('follower', '==', userHandle)
        .get()
        .then(doc => {
            doc.forEach(data => {
                following.push(data.data().owner)
            })
        })
        .then(() => {
            return response.json(following)
        })
        .catch(error => {
            console.error(error);
            return response.status(500).json(error)
        })
}