const isEmpty = (value) => {
    if (value.trim() === '' || !value) return true;
    return false;
}

const isEmail = (email) => {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

exports.validateSignup = (newUser) => {
    let errors = {};
    if (isEmpty(newUser.email)) {
        errors.email = 'Email must not be empty'
    } else if (!isEmail(newUser.email)) {
        errors.email = 'Must be a valid email'
    }

    if (isEmpty(newUser.password)) {
        errors.password = 'Password must not be empty'
    }
    if (newUser.password !== newUser.confirmPassword) {
        errors.confirmPassword = 'Password must match'
    }
    if (isEmpty(newUser.handle)) {
        errors.handle = 'User handle must not be empty'
    }
    
    return {
        valid: Object.keys(errors).length > 0 ? false: true, 
        errors
    }
}

exports.validateLogin = (data) => {
    let errors = {};
    if (isEmpty(data.email)) {
        errors.email = 'Email must not be empty';
    } else if (!isEmail(data.email)) {
        errors.email = 'Must be a valid email';
    }
    if (isEmpty(data.password)) {
        errors.password = 'Password must not be empty';
    }
    return {
        valid: Object.keys(errors).length >0 ? false: true, 
        errors: errors
    }
}

exports.addUserDetails = (data) => {
    let userDetails = {};
    if(!isEmpty(data.bio.trim())) userDetails.bio = data.bio.trim();
    if(!isEmpty(data.website.trim())) {
        if(data.website.trim().substring(0,4) !== 'http'){
            userDetails.website = `http://${data.website.trim()}`;    
        }else {
            userDetails.website = data.website.trim();
        }
    }
    if(!isEmpty(data.location.trim())) userDetails.location = data.location.trim();
    return userDetails;
}