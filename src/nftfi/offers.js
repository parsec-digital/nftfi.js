/**
 * @class
 * Class for working with offers.
 */
class Offers {
  #account;
  #api;
  #helper;
  #loans;

  constructor(options = {}) {
    this.#account = options?.account;
    this.#api = options?.api;
    this.#helper = options?.offersHelper;
    this.#loans = options?.loans;
  }

  /**
   * When called with no argument, gets all offers made by your account.
   * When provided with filters, gets all offers by specified filters.
   *
   * @param {object} [options] - Hashmap of config options for this method
   * @param {string} [options.filters.nft.address] - NFT contract address to filter by (optional)
   * @param {string} [options.filters.nft.id] - NFT id of the asset to filter by (optional)
   * @returns {Array<object>} Array of offers
   *
   * @example
   * // Get all offers made by your account
   * const offers = await nftfi.offers.get();
   *
   * @example
   * // Get all offers made by your account, for a given NFT
   * const offers = await nftfi.offers.get({
   *   filters: {
   *     nft: {
   *       address: "0x00000000",
   *       id: "42"
   *     }
   *   }
   * });
   *
   * @example
   * // Get all offers made by your account, for multiple NFTs in a collection
   * const offers = await nftfi.offers.get({
   *   filters: {
   *     nft: {
   *       address: "0x00000000"
   *     }
   *   }
   * });
   */
  async get(options = {}) {
    let params = {};
    if (options?.filters?.nft) {
      if (options.filters.nft.address && options?.filters?.nft?.id) {
        params = {
          nftAddress: options.filters.nft.address,
          nftId: options.filters.nft.id
        };
      } else if (options.filters.nft.address) {
        params = {
          nftAddress: options.filters.nft.address
        };
      }
    } else {
      params = {
        lenderAddress: this.#account.getAddress()
      };
    }
    let response = await this.#api.get({
      uri: 'offers',
      params
    });
    const offers = response['results'];
    return offers;
  }

  /**
   * Creates a new offer on a NFT.
   *
   * @param {object} options - Config options for this method
   * @param {object} options.terms - Terms of the offer
   * @param {object} options.nft - NFT to place an offer on
   * @param {object} options.borrower - Owner of the NFT
   * @param {object} options.nftfi - NFTfi options
   * @returns {object} Response object
   *
   * @example
   * // Create an offer on a NFT
   * const offer = await nftfi.offers.create({
   *   terms: {
   *     principal: 1000000000000000000,
   *     repayment: 1100000000000000000,
   *     duration: 86400 * 7, // 7 days (in seconds)
   *     currency: "0x00000000"
   *   },
   *   nft: {
   *     address: "0x00000000",
   *     id: "42"
   *   },
   *   borrower: {
   *     address: "0x00000000"
   *   },
   *   nftfi: {
   *     contract: {
   *       name: "v2-1.loan.fixed"
   *     }
   *   }
   * });
   */
  async create(options) {
    options = { ...options.listing, ...options }; // copying options.listing fields onto the root, for backwards compatibility.
    let errors;
    const simulationDryRun = options?.simulation?.dryRun || false
    const contractName = options.nftfi.contract.name;
    switch (contractName) {
      case 'v2-1.loan.fixed': {
        let payload = await this.#helper.constructV2Offer(options);
        if (simulationDryRun === false) {
          response = await this.#api.post({
            uri: 'offers',
            payload
          });
        } else {
          response = payload
        }
        break;
      }
      default: {
        errors = { 'nftfi.contract.name': [`${contractName} not supported`] };
        response = { errors };
        break;
      }
    }
    return response;
  }

  /**
   * Deletes an active offer made by your account.
   *
   * @param {object} options - Hashmap of config options for this method
   * @param {object} options.offer.id - The Id of the offer to be deleted
   * @returns {object} Response object
   *
   * @example
   * // Get first avilable offer made by your account
   * const offers = await nftfi.offers.get();
   * const offerId = offers[0]['id'];
   * // Delete the offer by Id
   * const deleted = await nftfi.offers.delete({
   *   offer: {
   *     id: offerId
   *   }
   * });
   */
  async delete(options) {
    const uri = `offers/${options.offer.id}`;
    const result = await this.#api.delete({ uri });
    return result;
  }

  /**
   * Revokes an active offer made by your account.
   *
   * @param {object} options - Hashmap of config options for this method
   * @param {object} options.offer.nonce - The nonce of the offer to be deleted
   * @param {string} options.nftfi.contract.name - Name of contract which the offer was created for: `v1.loan.fixed`, `v2.loan.fixed`, `v2-1.loan.fixed`
   * @returns {object} Response object
   *
   * @example
   * // Get first avilable offer made by your account
   * const offers = await nftfi.offers.get();
   * const nonce = offers[0]['lender']['nonce'];
   * const contractName = offers[0]['nftfi']['contract']['name']
   * // Revoke offer
   * const revoked = await nftfi.offers.revoke({
   *   offer: { nonce },
   *   nftfi: { contract: { name: contractName } }
   * });
   */
  async revoke(options) {
    let result = await this.#loans.revokeOffer(options);
    return result;
  }
}

export default Offers;
