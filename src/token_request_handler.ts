/*
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {AuthorizationServiceConfiguration} from './authorization_service_configuration';
import {AppAuthError} from './errors';
import {log} from './logger';
import {BasicQueryStringUtils, QueryStringUtils} from './query_string_utils';
import {TokenRequest} from './token_request';
import {TokenError, TokenErrorJson, TokenResponse, TokenResponseJson} from './token_response';
import {StringMap} from './types';
import {JQueryRequestor, Requestor} from './xhr';


/**
 * Represents an interface which can make a token request.
 */
export interface TokenRequestHandler {
  /**
   * Performs the token request, given the service configuration.
   */
  performTokenRequest(configuration: AuthorizationServiceConfiguration, request: TokenRequest):
      Promise<TokenResponse>;
}

/**
 * The default token request handler.
 */
export class BaseTokenRequestHandler implements TokenRequestHandler {
  constructor(
      public readonly requestor: Requestor = new JQueryRequestor(),
      public readonly utils: QueryStringUtils = new BasicQueryStringUtils()) {}

  private isTokenResponse(response: TokenResponseJson|
                          TokenErrorJson): response is TokenResponseJson {
    return (response as TokenErrorJson).error === undefined;
  }

  performTokenRequest(configuration: AuthorizationServiceConfiguration, request: TokenRequest):
      Promise<TokenResponse> {
    let tokenResponse = this.requestor.xhr<TokenResponseJson|TokenErrorJson>({
      url: configuration.tokenEndpoint,
      method: 'POST',
      dataType: 'json',  // adding implicit dataType
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      data: this.utils.stringify(request.toStringMap())
    });

    return tokenResponse.then(response => {
      // check for error response
      if (this.isTokenResponse(response)) {
        return TokenResponse.fromJson(response);
      } else {
        return Promise.reject<TokenResponse>(
            new AppAuthError(response.error, TokenError.fromJson(response)));
      }
    });
  }
}
