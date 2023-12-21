// ApiResponse.js

class ApiResponse {
  constructor(responseCode, responseMessage, responseData = null) {
    this.responseCode = responseCode;
    this.responseMessage = responseMessage;
    this.responseData = responseData;
  }

  static response(responseCode, responseMessage, responseData = null) {
    return new ApiResponse(responseCode, responseMessage, responseData);
  }

  static error(responseCode, responseMessage) {
    return new ApiResponse(responseCode, responseMessage);
  }
}

export default ApiResponse;
