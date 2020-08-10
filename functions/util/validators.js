// Checks if email is valid
const isEmail = (email) => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  else return false;
};
// Checks if string is empty
const isEmpty = (string) => {
  if (string === undefined) return true;
  else if (string.trim() === "") return true;
  else return false;
};
// Validates Signup info
exports.validateSignupData = (data, age) => {
  let errors = {};

  if (isEmpty(data.email)) errors.email = "Lauks nedrīkst būt tukšs";
  else if (!isEmail(data.email)) errors.email = "Jābūt derīgai e-pasta adresei";
  if (isEmpty(data.password)) errors.password = "Lauks nedrīkst būt tukšs";
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Parolēm jābūt vienādām";
  if (isEmpty(data.handle)) errors.handle = "Lauks nedrīkst būt tukšs";
  if (isEmpty(data.gender)) errors.gender = "Izvēlieties dzimumu";
  if (isEmpty(data.day) || isEmpty(data.month) || isEmpty(data.year))
    errors.day = "Nederīgs dzimšanas datums";
  if (data.checkedB === false)
    errors.checkedB = "Jums jāpiekrīt lietošanas noteikumiem";
  if (age < 18) errors.day = "Jums jābūt vismaz 18 gadus vecam";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};
// Validates Login info
exports.validateLoginData = (data) => {
  let errors = {};

  if (isEmpty(data.email)) errors.email = "Lauks nedrīkst būt tukšs";
  if (isEmpty(data.password)) errors.password = "Lauks nedrīkst būt tukšs";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};
// Removes user detail if it's empty
exports.reduceUserDetails = (data) => {
  let userDetails = {};

  if (!isEmpty(data.handle)) userDetails.handle = data.handle;
  if (!isEmpty(data.bio)) userDetails.bio = data.bio;
  if (!isEmpty(data.location)) userDetails.location = data.location;
  if (!isEmpty(data.education)) userDetails.education = data.education;
  if (!isEmpty(data.work)) userDetails.work = data.work;
  if (!isEmpty(data.drink)) userDetails.drink = data.drink;
  if (!isEmpty(data.smoke)) userDetails.smoke = data.smoke;
  if (!isEmpty(data.height)) userDetails.height = data.height;
  if (!isEmpty(data.idealPartner)) userDetails.idealPartner = data.idealPartner;

  return userDetails;
};
