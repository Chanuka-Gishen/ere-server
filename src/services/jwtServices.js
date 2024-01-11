import jwt from "jsonwebtoken";

export const generateToken = (id, role) => {
  return jwt.sign({ id: id, role: role }, process.env.JWT_SECRET);
};

export const verifyUserToken = (req) => {
  let token = req.header("Authorization");
  token = token.slice(7, token.length).trimLeft();

  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return payload;
};
