module archivechain::registry {
    use std::string::String;
    use std::option;
    use std::vector;

    use sui::object;
    use sui::tx_context;
    use sui::transfer;
    use sui::clock::{Self, Clock};
    use sui::event;

    //
    // Structs
    //

    /// A single archived snapshot of a URL.
    public struct Archive has key, store {
        id: object::UID,

        // Core identity
        url: String,
        walrus_blob_id: String,
        tusky_file_id: String,

        // Integrity
        content_hash: vector<u8>,                // SHA-256 from backend (later)
        version_number: u64,
        previous_archive_id: option::Option<object::ID>,

        // Metadata
        title: String,
        captured_at_ms: u64,                     // on-chain clock timestamp (ms)
        captured_by: address,                    // Sui address of who archived
    }

    /// Tracks all versions for a given URL.
    public struct URLRegistry has key, store {
        id: object::UID,
        url: String,
        all_archive_ids: vector<object::ID>,
        latest_archive_id: option::Option<object::ID>,
        total_versions: u64,
    }

    /// Event emitted whenever a new archive is created.
    public struct ArchiveCreated has copy, drop {
        archive_id: object::ID,
        url: String,
        walrus_blob_id: String,
        tusky_file_id: String,
        version_number: u64,
    }

    //
    // Entry functions
    //

    /// Create a new, immutable archive and link it into the URLRegistry.
    /// - Uses on-chain time (Clock) for captured_at_ms
    /// - Freezes the Archive so it’s public, permanent, and immutable.
    public entry fun create_archive(
        url: String,
        walrus_blob_id: String,
        tusky_file_id: String,
        content_hash: vector<u8>,
        title: String,
        registry: &mut URLRegistry,
        clock_ref: &Clock,
        ctx: &mut tx_context::TxContext,
    ) {
        // Who submitted this transaction
        let sender = tx_context::sender(ctx);

        // 1. Compute new version and previous id from registry
        let new_version_number = registry.total_versions + 1;
        let previous_id = registry.latest_archive_id;

        // 2. Create the Archive object
        let archive = Archive {
            id: object::new(ctx),
            url,
            walrus_blob_id,
            tusky_file_id,
            content_hash,
            version_number: new_version_number,
            previous_archive_id: previous_id,
            title,
            // CRITICAL: on-chain time
            captured_at_ms: clock::timestamp_ms(clock_ref),
            captured_by: sender,
        };

        // 3. Update registry state
        let new_archive_id = object::id(&archive);
        registry.total_versions = new_version_number;
        registry.latest_archive_id = option::some(new_archive_id);
        vector::push_back(&mut registry.all_archive_ids, new_archive_id);

        // 4. Emit ArchiveCreated event for off-chain indexers
        event::emit(ArchiveCreated {
            archive_id: new_archive_id,
            url: archive.url,
            walrus_blob_id: archive.walrus_blob_id,
            tusky_file_id: archive.tusky_file_id,
            version_number: archive.version_number,
        });

        // 5. Make the Archive immutable & publicly readable forever
        transfer::public_freeze_object(archive);
    }

    /// Create a new URLRegistry for a URL we haven't tracked before.
    /// Ownership of the registry goes to the caller (e.g. your backend’s address).
    public entry fun create_registry(
        url: String,
        ctx: &mut tx_context::TxContext,
    ) {
        let registry = URLRegistry {
            id: object::new(ctx),
            url,
            all_archive_ids: vector::empty(),
            latest_archive_id: option::none(),
            total_versions: 0,
        };

        transfer::transfer(registry, tx_context::sender(ctx));
    }
}
