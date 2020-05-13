const { db, admin } = require('../utils/admin');
const firebaseConfig = require('../utils/config');
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);
const { validateSignup, validateLogin, addUserDetails } = require('../utils/validators');

exports.signup = (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        handle: request.body.handle
    }

    const { valid, errors } = validateSignup(newUser);
    if (!valid) {
        return response.status(400).json( errors )
    }
    let token, userId;
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then((data) => {
            if (data.exists) {
                return response.status(400).json({
                    handle: "This handle is already taken"
                })
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password)
                    .then((data) => {
                        userId = data.user.uid;
                        return data.user.getIdToken()
                    })
                    .then((idToken) => {
                        token = idToken;
                        const userCredentials = {
                            email: newUser.email,
                            handle: newUser.handle,
                            createdAt: new Date().toISOString(),
                            userId: userId,
                            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/no-avatar.png?alt=media`
                        }
                        db.doc(`/users/${newUser.handle}`).set(userCredentials);
                    })
                    .then(() => {
                        return response.status(201).json({
                            token: token
                        })
                    })
                    .catch((error) => {
                        if (error.code === 'auth/email-already-in-use') {
                            return response.status(400).json({ email: "Email is already in use" })
                        }
                        return response.status(500).json({
                            general: 'Something went wrong, please try again.'
                        })
                    })
            }
        })

}

exports.login = (request, response) => {
    const user = {
        email: request.body.email,
        password: request.body.password
    }

    const { valid, errors } = validateLogin(user);
    if (!valid) {
        console.log(errors);
        return response.status(400).json(errors)
    }
    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then((data) => {
            return data.user.getIdToken();
        })
        .then((token) => {
            return response.json({ token });
        })
        .catch((error) => {
            console.error(error);
            return response.status(500).json({
                general: 'Wrong credentials, please check again.'
            })
        })
}

exports.uploadImage = (request, response) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({
        headers: request.headers
    })

    let imageName;
    let imageTobeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if(mimetype !== 'image/png' && mimetype !== 'image/jpeg') {
            return response.status(400).json({
                error: 'Wrong file type submmited'
            })
        }
        //.png, .jpg
        const imageExtension = filename.split('.')[filename.split('.').length - 1]
        //314646142154.png
        imageName = `${String(new Date().getTime())}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageName);
        imageTobeUploaded = {
            filepath, 
            mimetype
        }
        file.pipe(fs.createWriteStream(filepath))
    });
    busboy.on('finish', () => {
        admin.storage().bucket(`${firebaseConfig.storageBucket}`).upload(imageTobeUploaded.filepath, {
            resumable: false, 
            metadata: {
                metadata: {
                    contentType: imageTobeUploaded.mimetype
                }
            }
        })
        .then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageName}?alt=media`;
            return db.doc(`/users/${request.user.handle}`).update({ imageUrl });
        })
        .then(() => {
            return response.json({
                message: 'Image uploaded successfully.'
            })
        })
        .catch((error) => {
            console.error(error);
            return response.status(500).json(error)
        })
        
    })
    busboy.end(request.rawBody);
} 

exports.addUserDetails = (request, response) => {
    const userDetails = addUserDetails(request.body);
    
    db.doc(`/users/${request.user.handle}`)
        .update(userDetails)
        .then(() => {
            return response.json({
                message: 'User updated successfully.'
            })
        })
        .catch((error) => {
            console.error(error);
            return response.json(error)
        })
}

exports.getAuthenticatedUser = (request, response) => {
    let userData = {};
    db.doc(`/users/${request.user.handle}`)
        .get()
        .then((doc) => {
            userData.credentials = doc.data();
            return db.collection('likes').where('userHandle', '==', request.user.handle).get()
        })
        .then((data) => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data())
            })
            return db.collection('notifications')
                .where('recipient', '==', request.user.handle)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get()
        })
        .then((data) => {
            userData.notifications = [];
            data.forEach(doc => {
                userData.notifications.push({
                    recipient: doc.data().recipient, 
                    sender: doc.data().sender, 
                    screamId: doc.data().screamId, 
                    type: doc.data().type, 
                    read: doc.data().read, 
                    createdAt: doc.data().createdAt, 
                    notificationId: doc.id
                })
            })
            return response.json(userData)
        })
        .catch((error) => {
            console.error(error);
            return response.status(500).json({error})
        })
}

exports.getUserDetails = (request, response) => {
    let userData = {};
    db.doc(`/users/${request.params.handle}`)
        .get()
        .then((doc) => {
            if(doc.exists) {
                userData.user = doc.data();
                return db.collection('screams')
                    .where('userHandle', '==', request.params.handle)
                    .orderBy('createdAt', 'desc')
                    .get()
            }
        })
        .then(data => {
            userData.screams = [];
            data.forEach(doc => {
                userData.screams.push({
                    screamId: doc.id, 
                    body: doc.data().body, 
                    userHandle: doc.data().userHandle, 
                    userImage: doc.data().userImage, 
                    likeCount: doc.data().likeCount, 
                    commentCount: doc.data().commentCount, 
                    createdAt: doc.data().createdAt, 

                })
            })
            return response.json(userData);
        })
        .catch(error => {
            console.error(error)
            return response.status(500).json(error)
        })
}

exports.markNotiRead = (request, response) => {
    let batch = db.batch();
    request.body.forEach(notiId => {
        const notification = db.doc(`/notifications/${notiId}`);
        batch.update(notification, {read: true});
    });
    batch.commit()
        .then(() => {
            return response.json({
                message: 'Notifications marked read'
            })
        })
        .catch(error => {
            console.error(error);
            return response.status(500).json(error);
        })
}